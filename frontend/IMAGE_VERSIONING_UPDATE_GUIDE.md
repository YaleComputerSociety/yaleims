# Image Versioning Update Guide

## ✅ Completed Updates

### 1. Configuration Files
- ✅ `next.config.ts` - Added cache headers for images
- ✅ `tsconfig.json` - Added `@/*` path alias

### 2. Utility Created
- ✅ `src/utils/versionedImages.ts` - Versioning utility with helpers:
  - `getVersionedImage(path, version?)` - Generic versioning
  - `getCollegeFlag(collegeName, version?)` - For college flags
  - `getMVPImage(imageName, version?)` - For MVP images
  - `getDevImage(imageName, version?)` - For dev team images
  - `getLoaderAnimation(animationName, version?)` - For loader animations

### 3. Components Updated
- ✅ `src/components/LoadingSpinner.tsx`
- ✅ `src/components/Home/MVPPopup.tsx`
- ✅ `src/components/Scores/TableRow.tsx`
- ✅ `src/components/Brackets/BracketCell.tsx`

## 🔄 Remaining Components to Update

### College Flags (`getCollegeFlag()`)
Replace `/college_flags/${collegeName}.png` with `getCollegeFlag(collegeName)`

**Files:**
1. `src/components/AddScores/MatchCard.tsx` (lines 162, 173)
2. `src/components/Home/AllTimeLeaderboard.tsx` (line 51)
3. `src/components/Home/LeaderboardMobile.tsx` (lines 103-106, 115, 165-168)
4. `src/components/Scores/CollegeSummaryCardMobile.tsx` (line 32)
5. `src/components/Scores/CollegeSummaryCard.tsx` (line 43)
6. `src/components/Dashboard/User/StatsBox.tsx` (line 32)
7. `src/components/Home/PredictionPodiums.tsx` (line 66)
8. `src/components/Home/AllTimePodiums.tsx` (line 51)
9. `src/components/YOdds/BetOption.tsx` (line 60)
10. `src/components/YOdds/BetSlipRow.tsx` (line 72)
11. `src/components/Home/YearlyLeaderboardTable.tsx` (line 118)
12. `src/app/profile/page.tsx` (line 205)

### Medal Overlays (also use `getVersionedImage()`)
Replace `/college_flags/[medal]_overlay.png` with `getVersionedImage('/college_flags/[medal]_overlay.png')`

**Files:**
1. `src/components/Home/PredictionPodiums.tsx` (lines 24-26)
2. `src/components/Home/AllTimePodiums.tsx` (lines 6-8)

### Dev Team Images (`getDevImage()`)
Replace `/dev_images/[name]` with `getDevImage('[name]')`

**File:**
- `src/app/about-us/page.tsx` (lines 16, 24, 32, 40, 48, 56, 64, 75, 83, 91, 99, 107, 115, 123, 134, 142, 150+)

### Other Images (use `getVersionedImage()`)
**Files:**
1. `src/components/Footer.tsx` - `LOGO.png`
2. `src/components/NavBar.tsx` - `/LOGO.png`
3. `src/app/not-found.tsx` - `404.png`
4. `src/app/odds/page.tsx` - `/YCoin.png`
5. `src/app/profile/page.tsx` - `/YCoin.png`
6. `src/app/brackets/page.tsx` - `/trophy.png`

## 📝 Update Pattern

### Before:
```tsx
<img src="/college_flags/Yale.png" alt="Yale" />
```

### After:
```tsx
import { getCollegeFlag } from "@/utils/versionedImages";

<img src={getCollegeFlag("Yale")} alt="Yale" />
```

### For Next.js Image Component:
```tsx
import Image from "next/image";
import { getCollegeFlag } from "@/utils/versionedImages";

<Image src={getCollegeFlag("Yale")} alt="Yale" width={100} height={100} />
```

### For Dynamic College Names:
```tsx
// Before
src={`/college_flags/${toCollegeName[college]}.png`}

// After
import { getCollegeFlag } from "@/utils/versionedImages";
src={getCollegeFlag(toCollegeName[college])}
```

## 🔄 Cache Busting

When you update images, simply change the version in `src/utils/versionedImages.ts`:

```typescript
const IMAGE_VERSION = "1.0.1";  // Increment this
```

All versioned images will automatically get the new version parameter!

## ✅ Testing

After updates:
1. Check that all images load correctly
2. View network tab - verify `?v=1.0.0` parameter appears
3. Update version and verify cache busts
4. Check both light and dark modes

## 📊 Progress: 4/40+ files updated (~10%)
