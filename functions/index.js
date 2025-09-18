import functions from 'firebase-functions';
export const ping = functions.https.onCall(async ()=>({ok:true}));
