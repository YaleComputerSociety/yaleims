import { useCallback } from "react";
import { getCookie, setCookie } from "cookies-next";

const useAuth = () => {
	const saveToken = useCallback((token: string | null) => {
		setCookie("token", token);
	}, []);

	const getToken = useCallback(() => {
		return getCookie("token");
	}, []);

	return {getToken, saveToken};
}

export default useAuth;