import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionUserId = cookieStore.get("session_user_id")?.value;

    if (!sessionUserId) {
      return NextResponse.json({ user: null });
    }

    const userRef = doc(db, "users", sessionUserId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: userSnap.data() });
  } catch (err: any) {
    console.error("Error reading session:", err);
    return NextResponse.json({ user: null, error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("session_user_id");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
