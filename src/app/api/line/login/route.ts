import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/src/lib/firebase-admin';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { code, state, redirectUri } = await req.json();

    // 1. State 検証
    const stateRef = adminDb.collection('oauthStates').doc(state);
    const stateDoc = await stateRef.get();
    if (!stateDoc.exists) return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
    const stateData = stateDoc.data();
    await stateRef.delete();

    // 2. LINE トークン交換
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINE_CLIENT_ID_NAVI!,
        client_secret: process.env.LINE_CLIENT_SECRET_NAVI!,
      }),
    });
    const tokenData = await tokenRes.json();

    // 3. IDトークン検証
    const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      body: new URLSearchParams({ id_token: tokenData.id_token, client_id: process.env.LINE_CLIENT_ID_NAVI! }),
    });
    const verifyData = await verifyRes.json();

    // 4. カスタムトークン発行
    const rawLineUid = verifyData.sub;
    const hashedUserId = crypto
      .createHash('sha256')
      .update(process.env.SALT + rawLineUid + process.env.PEPPER)
      .digest('hex');

    const customToken = await adminAuth.createCustomToken(hashedUserId);

    // 5. lineMessagingIds の更新 (旧サーバーのロジック)
    await adminDb.collection('lineMessagingIds').doc(hashedUserId).set({
      lineUid: rawLineUid,
      isNavi: true,
      updatedAt: new Date(),
    }, { merge: true });

    return NextResponse.json({
      customToken,
      profile: { displayName: verifyData.name, pictureUrl: verifyData.picture },
      redirectAfterLogin: stateData?.redirectAfterLogin,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}