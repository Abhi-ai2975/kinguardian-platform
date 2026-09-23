import Home from "@/modules/client/auth/components/landing/Home";
import { getServerSession } from "@/modules/server/auth-provider/auth-server";

async function HomePage() {
  const session = await getServerSession();

  return <Home session={session} />;
}

export default HomePage;
