import * as functions from "firebase-functions";
import admin from "../../firebaseAdmin.js";

import { updateEloRatings } from "./elo_system.js";
import { hybridOddsCalculator } from "./elo_odds_calculator.js";

const db = admin.firestore();

/**
 * HTTP function to iteratively process all matches in a season, in chronological order,
 * updating Elo ratings for each scored match.
 *
 * Request body:
 * - season: string (e.g., "2025-2026") — REQUIRED
 * - sport: string (optional) — if provided, only process matches of this sport
 * - limit: number (optional) — process up to N matches (useful for testing)
 *
 * Behavior:
 * - Reads `/matches/seasons/{season}` ordered by `timestamp` ascending.
 * - For EACH match, calculates odds BEFORE updating Elo (captures pre-match state).
 * - Then calls `updateEloRatings(...)` to update the Elo collection.
 * - Forfeit detection matches runExperiment.ts v1.1 logic:
 *   1. Double forfeit: voided, no odds, no stats
 *   2. Single forfeit with declared winner: odds calculated, stats updated, no Elo change
 *   3. Single forfeit inferred from scores: odds calculated, stats updated, no Elo change
 *   4. Regular match: odds calculated, Elo updated
 * - Returns: { success, processed, errors, csv, oddsCount }
 */
export const runEloSeason = functions.https.onRequest(
	{ timeoutSeconds: 540, memory: "1GiB" },
	async (req, res) => {
	if (req.method !== "POST") {
		res.status(405).json({ error: "Method Not Allowed" });
		return;
	}

	try {
		const { season, sport, limit } = req.body ?? {};
		if (!season || typeof season !== "string") {
			res.status(400).json({ error: "Missing required field 'season'" });
			return;
		}

		let q = db
			.collection("matches")
			.doc("seasons")
			.collection(season)
			.orderBy("timestamp", "asc");

		if (sport && typeof sport === "string") {
			q = q.where("sport", "==", sport);
		}

		if (limit && typeof limit === "number" && limit > 0) {
			q = q.limit(limit);
		}

		const snap = await q.get();
		if (snap.empty) {
			res.status(200).json({ success: true, processed: 0, message: "No matches found" });
			return;
		}

		let processed = 0;
		const errors: Array<{ id: string; error: string }> = [];
		const oddsData: Array<any> = [];

		for (const doc of snap.docs) {
			const data = doc.data() as any;

			const homeTeam: string | undefined = data.home_college;
			const awayTeam: string | undefined = data.away_college;
			const matchType: "Regular" | "Playoff" | "Final" | undefined = data.type;
			const ts: admin.firestore.Timestamp | undefined = data.timestamp;
			const homeScore: number = data.home_college_score ?? 0;
			const awayScore: number = data.away_college_score ?? 0;
			const matchSport: string | undefined = data.sport;
			const isForfeit: boolean = data.forfeit === true;
			const declaredWinner: string | undefined = data.winner;

			// Skip matches missing required fields
			if (!homeTeam || !awayTeam || !matchSport || !matchType || !ts) {
				errors.push({ id: doc.id, error: "Missing required match fields" });
				continue;
			}

			// --- FORFEIT DETECTION (matches runExperiment.ts v1.1 logic) ---
			let actualWinner: string;
			let forfeitingTeam: string | undefined;

			if (isForfeit) {
				// Case A: Double forfeit — both scores 0, no declared winner
				if (homeScore === 0 && awayScore === 0 && !declaredWinner) {
					actualWinner = "Default";

					// Double forfeit: voided, no odds, no stats
					try {
						await updateEloRatings({
							season,
							homeTeam,
							awayTeam,
							sport: matchSport,
							winner: "Default",
							matchType,
							home_college_score: 0,
							away_college_score: 0,
							forfeitingTeam: undefined, // no single forfeiter = double forfeit
						});
						processed += 1;
					} catch (e: any) {
						errors.push({ id: doc.id, error: String(e?.message ?? e) });
					}
					continue; // skip odds calculation for voided matches
				}

				// Case B: Single forfeit with declared winner
				if (declaredWinner) {
					actualWinner = declaredWinner;
					forfeitingTeam = declaredWinner === homeTeam ? awayTeam : homeTeam;
				} else {
					// Case C: Single forfeit — infer winner from scores
					if (homeScore === 0 && awayScore > 0) {
						forfeitingTeam = homeTeam;
						actualWinner = awayTeam;
					} else if (awayScore === 0 && homeScore > 0) {
						forfeitingTeam = awayTeam;
						actualWinner = homeTeam;
					} else {
						// Unclear — use higher score
						forfeitingTeam = homeScore > awayScore ? awayTeam : homeTeam;
						actualWinner = homeScore > awayScore ? homeTeam : awayTeam;
					}
				}

				// For single forfeits, actualWinner is a college code.
				// updateEloRatings expects winner="Default" for forfeits.
				// Calculate odds before updating stats.
				try {
					const odds = await hybridOddsCalculator(
						homeTeam,
						awayTeam,
						matchSport,
						season
					);

					oddsData.push({
						matchId: doc.id,
						timestamp: ts.toDate().toISOString(),
						sport: matchSport,
						homeTeam,
						awayTeam,
						homeWinOdds: odds.team1Win,
						awayWinOdds: odds.team2Win,
						drawOdds: odds.draw,
						actualWinner,
						homeScore,
						awayScore,
						matchType,
						isForfeit: true,
					});
				} catch (oddsErr: any) {
					console.warn(`Failed to calculate odds for forfeit match ${doc.id}:`, oddsErr);
				}

				try {
					await updateEloRatings({
						season,
						homeTeam,
						awayTeam,
						sport: matchSport,
						winner: "Default",
						matchType,
						home_college_score: homeScore,
						away_college_score: awayScore,
						forfeitingTeam,
					});
					processed += 1;
				} catch (e: any) {
					errors.push({ id: doc.id, error: String(e?.message ?? e) });
				}
				continue;
			}

			// --- REGULAR MATCH (not a forfeit) ---
			if (!declaredWinner) {
				// No winner and not a forfeit — unscored match, skip
				continue;
			}

			actualWinner = declaredWinner;

			// Calculate odds BEFORE updating Elo (to get pre-match odds)
			try {
				const odds = await hybridOddsCalculator(
					homeTeam,
					awayTeam,
					matchSport,
					season
				);

				oddsData.push({
					matchId: doc.id,
					timestamp: ts.toDate().toISOString(),
					sport: matchSport,
					homeTeam,
					awayTeam,
					homeWinOdds: odds.team1Win,
					awayWinOdds: odds.team2Win,
					drawOdds: odds.draw,
					actualWinner,
					homeScore,
					awayScore,
					matchType,
					isForfeit: false,
				});
			} catch (oddsErr: any) {
				console.warn(`Failed to calculate odds for match ${doc.id}:`, oddsErr);
			}

			try {
				await updateEloRatings({
					season,
					homeTeam,
					awayTeam,
					sport: matchSport,
					winner: actualWinner,
					matchType,
					home_college_score: homeScore,
					away_college_score: awayScore,
				});
				processed += 1;
			} catch (e: any) {
				errors.push({ id: doc.id, error: String(e?.message ?? e) });
			}
		}

		// Convert odds data to CSV format
		let csvContent = "matchId,timestamp,sport,homeTeam,awayTeam,homeWinOdds,awayWinOdds,drawOdds,actualWinner,homeScore,awayScore,matchType,isForfeit\n";
		for (const row of oddsData) {
			csvContent += `${row.matchId},${row.timestamp},${row.sport},${row.homeTeam},${row.awayTeam},${row.homeWinOdds},${row.awayWinOdds},${row.drawOdds},${row.actualWinner},${row.homeScore},${row.awayScore},${row.matchType},${row.isForfeit}\n`;
		}

		res.status(200).json({ success: true, processed, errors, csv: csvContent, oddsCount: oddsData.length });
		return;
	} catch (err: any) {
		console.error("runEloSeason error", err);
		res.status(500).json({ success: false, error: String(err?.message ?? err) });
		return;
	}
});
