# Frk Polls

This version includes the requested changes:

- Name changed to **Frk Polls**
- Bar chart logo added
- Landing page description added
- Focus sectors added: Politics, Financial Sector, Health, Sports and Education
- Multiple polls inside the website
- Admin page access protection retained
- Voters can only access voting and results pages
- Position dropdown added:
  - President
  - Governor
  - Senetor
  - Women Rep
  - Member of Parliament
  - MCA
- Dashboard results and vote charts show aspirant photos
- ID number requirement removed
- Browser-based voting restriction added: one vote per browser for each poll

## Admin login

Open `admin.html` to manage polls, aspirants, voting links, and end polls.

## Firebase Firestore Rules

Go to Firebase Console → Firestore Database → Rules, then use this for testing:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /polls/{document=**} {
      allow read, write: if true;
    }
    match /aspirants/{document=**} {
      allow read, write: if true;
    }
    match /votes/{document=**} {
      allow read, write: if true;
    }
  }
}
```

Click **Publish**.

## How browser voting works

When someone opens the voting page, the website creates a unique token and saves it in that browser's local storage. The token is used to create one Firebase vote record for the selected poll. A Firestore transaction blocks another vote from the same browser token in that poll.

This restriction is browser-based, not identity-based. A person can vote again by using another browser or device, private/incognito browsing, or clearing the site's browser data. For stronger public-election controls, use verified login, OTP, or another identity-verification method.

## How to use

1. Host the folder on Netlify or Firebase Hosting.
2. Open `admin.html`.
3. Login with the admin passcode.
4. Create a poll.
5. Add aspirants under the selected poll.
6. Copy the voting link and share it with voters.
7. View live results on `dashboard.html`.

## Important security note

This version uses simple frontend admin protection and open testing rules. It is suitable for demonstrations and low-risk opinion polls. For a sensitive or official poll, use Firebase Authentication, server-side vote validation, and stricter Firestore rules.
