"use client";

import AAHomeComponent from "@/components/home/AAHomeComponent";
// import LoadingScreen from "@/components/layout/LoadingScreen";
// import { useUser } from "@/context/UserContext";

const HomePage: React.FC = () => {
  // const { user, loading } = useUser();
  // const router = useRouter();

  // const unauthenticated = !loading && !user;

  // useEffect(() => {
  //   if (unauthenticated) router.replace("/hub");
  // }, [unauthenticated, router]);

  // if (loading || unauthenticated) return <LoadingScreen />;

  return (
    <div className="min-h-screen">
      <AAHomeComponent />
    </div>
  );
};

export default HomePage;
