import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const session = await auth();

  if (session?.user?.onboardingStatus === "COMPLETE") {
    redirect("/wardrobe");
  }

  // Default entry point is the photo analysis step
  redirect("/onboarding/photo");
}
