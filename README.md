# Poll Voting Web App

This is a multi-page poll/voting website with:

- `index.html` - Landing page
- `admin.html` - Add aspirants with names, positions, and image links
- `vote.html` - Public voting page
- `dashboard.html` - Live results dashboard with KPI cards, progress bars, pie chart, and bar chart
- `styles.css` - Modern layout, colors, cards, responsive design
- `app.js` - Firebase connection, voting logic, and dashboard charts
- `firebase-config.js` - Paste your Firebase configuration here

## Important

Normal HTML cannot store online votes by itself. For live voting, you must connect Firebase Firestore.

## Firebase Setup

1. Go to Firebase Console.
2. Create a new project.
3. Create a Web App inside the project.
4. Copy the Firebase configuration.
5. Open `firebase-config.js` and replace the sample values with your real Firebase config.
6. In Firebase, open Firestore Database and create a database.
7. Start in test mode while testing.
8. Host the folder online using Firebase Hosting, Netlify, Vercel, GitHub Pages, or any web host.

## Links to Share

After hosting, share:

- Voting page: `https://your-domain.com/vote.html`
- Dashboard page: `https://your-domain.com/dashboard.html`

## Image Notes

The admin page uses image URLs. Upload photos to a public image host first, then paste the direct image link.

## Voting Limitation

This template prevents repeat voting using the voter’s browser local storage. For stricter voting, you would need login, phone verification, email verification, or voter ID verification.
