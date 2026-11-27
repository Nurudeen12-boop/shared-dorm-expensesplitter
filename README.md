# Shared Dorm Expense Splitter

Roommates log in, record shared expenses, split them equally, record payments and see who owes whom.
Mobile-first web app, one HTML page per screen: **HTML + CSS + JavaScript** front end, **Firebase** (Authentication + Firestore) back end, **Vercel** hosting. No build step.

```
index.html            Welcome screen
login.html            Login (+ join via group link)
signup.html           Create account
forgot.html           Forgot password
group-setup.html      Create a group / join a group (shown once, after first login)
dashboard.html        Total balance, who owes whom, recent expenses
history.html          Past expenses with filters + recorded payments
add-expense.html      Add expense (add-expense.html?id=... edits one)
record-payment.html   Record a payment between two members
expense-detail.html   One expense: shares, edit, delete

css/styles.css        all styles (purple theme from the Figma screens)
js/pages/*.js         one small script per page (fills lists, handles the form)
js/session.js         sign-in check + live group data, shared by all pages
js/calc.js            all money maths (equal split, who-owes-whom, settled/unpaid)  <- unit tested
js/db.js, auth.js     Firestore + Firebase Auth access
js/drawer.js          the slide-in menu
firestore.rules       security rules: users only access their own group
tests/                node:test unit tests + page consistency tests
docs/DESIGN_CORRECTIONS.md   what changed vs. the schema/UI and why
```

## 1. Run the tests (no setup needed)

```bash
npm test
```

## 2. Connect Firebase (one time)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. **Build → Authentication → Get started → Email/Password → Enable**.
3. **Build → Firestore Database → Create database** (production mode).
4. **Firestore → Rules** → paste the contents of `firestore.rules` → **Publish**.
5. **Project settings → Your apps → Web (`</>`)** → register an app → copy the config into `js/firebase-config.js`.
6. After deploying, add your Vercel domain under **Authentication → Settings → Authorized domains**.

## 3. Run locally

```bash
npx serve .
```

Open the printed URL on your computer or phone (same Wi-Fi). Firebase needs `http://localhost` or `https`, so don't open `index.html` by double-clicking it.

## 4. Deploy on Vercel

Import the GitHub repo on vercel.com → Framework Preset **Other** → leave build command and output directory empty → Deploy.
Every push to `main` redeploys.

## 5. Team workflow (Git)

```bash
git clone https://github.com/Nurudeen12-boop/shared-dorm-expensesplitter.git
git checkout -b feature/your-task
# ...work...
git add . && git commit -m "Describe the change"
git push -u origin feature/your-task      # then open a Pull Request
```

## How the splitting works

- The person who adds an expense is the one who paid; everyone ticked owes them an equal share.
- Money is stored in kobo (whole numbers). If a total doesn't divide evenly (₦100 ÷ 3), the extra kobo go to the first people so the shares always add up exactly.
- A recorded payment settles the debtor's oldest unpaid shares first. Balances between two people are netted.
- Payments are only recorded. There is no payment gateway.
