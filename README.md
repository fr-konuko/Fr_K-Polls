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
- Dashboard results and vote charts now show aspirant photos
- ID number validation added: minimum 8 numerical digits

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

## How to use

1. Host the folder on Netlify or Firebase Hosting.
2. Open `admin.html`.
3. Login with the admin passcode.
4. Create a poll.
5. Add aspirants under the selected poll.
6. Copy the voting link and share it with voters.
7. View live results on `dashboard.html`.

## Important note about security

This version uses simple frontend admin protection, which is fine for demos and controlled internal use. For a public election or sensitive poll, use Firebase Authentication and stricter Firestore rules.
