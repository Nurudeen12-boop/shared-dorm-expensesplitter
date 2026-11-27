# Design corrections and decisions

The UI screens, `DATABASE_SCHEMA_DOCUMENTATION.docx` and `Architecture_Design1.pdf` disagree in a few places.
This file records what was changed during implementation and why, so the SRS and design documents can be updated to match.

## 1. Database schema vs. architecture

| Schema document | What was built | Why |
|---|---|---|
| SQL tables, `INT` auto-increment IDs | Firestore collections, string IDs | Architecture §1.4 chooses Firebase Firestore (NoSQL). |
| `USER.password` | **Removed** | Firebase Authentication handles passwords (Architecture §1.3). Storing passwords ourselves is a security risk and duplicates Firebase. |
| `USER.phone_no` | Replaced by `email` | The Login and Create Account screens use email. Phone is not collected anywhere in the UI. |
| *(no group table)* | **Added** `groups` and `groups/{id}/members` | The architecture needs groups, "join via group link", an administrator, and security rules so "users only access their own group". The four-table schema cannot express this. |
| `BILL.due_date` NOT NULL | Optional (stored as `null`) | The Add Expense screen has no due-date field. |
| `BILL.created_by` | `createdBy` = the person who **paid the bill** | The Dashboard's "who owes whom" only works if one person fronted the money. |
| `DECIMAL(10,2)` | Integer **kobo** (`8000` = ₦80.00), same ₦99,999,999.99 limit | Avoids floating-point errors. All maths in `js/calc.js`. |
| `BILL SHARE` table | Stored inside each expense as a `shares` map | One atomic write per expense. Edits stay consistent. |
| `BILL SHARE.amount_paid` / `payment_status` | **Derived** from payments, not stored | Stored copies go stale when an expense is edited or a payment is undone. UI states: Unpaid / Settled. |
| `PAYMENT.share_id` (+ one `user_id`) | `fromMemberId`, `toMemberId`, `amountKobo`, `paymentDate`, `method`, `note` | The Record Payment screen records a payment *between two members*, not against one share. Payments are applied to the **oldest unpaid** shares first. |
| `PAYMENT.payment_status` | Removed | A recorded payment is always final (there is no payment gateway). It can be undone by whoever recorded it. |

## 2. Corrections to the UI screens

| Screen | Problem in the mock-up | Fix |
|---|---|---|
| Welcome | Step 1 says "Enter the total & taxes". Tax/tip were removed from the requirements. | "Enter the total amount". |
| Dashboard | "Tolu owes overall" under ₦42.50, but 25 + 30 − 12.50 = +42.50 means Tolu is **owed**. | Caption is computed: "You are owed overall" / "You owe overall" / "You're all settled up". |
| Dashboard | Two hamburger menus (left and right). | Left = navigation menu, right = invite roommates (share group link). |
| History | Numbers don't add up (₦15 ÷ 4 = "₦20 you owe"; ₦80 ÷ 4 = "₦8 you owe"). | Every figure is calculated from the real shares. |
| Add Expense | Title arrow points right (→), which reads as "forward". | Back arrow (←). Also shows a note when the total doesn't divide evenly (e.g. ₦100 ÷ 3). |
| Record Payment | Footer says "mark as settled", which is only true if the payment covers the debt. | "Updates balances and settles the oldest unpaid expenses first". |
| Forgot Password | "Link will expire in 30 minutes". Firebase's reset link expiry is fixed and not configurable. | Generic "check your inbox (and spam folder)". |
| Login | "Join via group link" had no defined behaviour. | The link is saved; after login/sign-up the user is added to that group. Invite links look like `login.html?join=GROUPID`. |

## 3. Screens that did not exist in Figma but are required

1. **Create or join a group** (shown after first login if the user has no group). The administrator is the user who creates the group.
2. **Expense details** (History says "Tap an entry to view details"). Shows each person's share and status, with Edit and Delete for the person who added it. This covers the requirement to edit logged expenses.
3. **Navigation menu** (Dashboard, History, Add expense, Record payment, Invite, Log out).
4. **Recorded payments** list under History (Record Payment promises "payments are recorded to history").

## 4. Decisions the team should confirm

- **Who can edit/delete an expense:** only the person who added it. Any member can record a payment between members.
- **One group per user** (a dorm room). Multiple groups would need a group switcher.
- **Add person** creates a name-only member (no account), as the requirements say "enter names of people sharing a bill". Registered users still join through the group link.
- **Admin refunds** were removed from scope, so the administrator has no special powers in this version beyond owning the group link.
- **Participation dashboard** (points per SE stage) belongs to the course project, not the app, and is not implemented.
