import { useCallback } from "react";
import { getCookie, setCookie } from "cookies-next";

const useAuth = () => {
	const saveUser = useCallback((token: string | null) => {
		setCookie("token", token);
	}, []);

	const getUser = useCallback(() => {
		return getCookie("token");
	}, []);

	return {getUser, saveUser};
}

export default useAuth;