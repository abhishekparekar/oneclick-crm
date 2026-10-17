# OneClick HRMS & AI Growth CRM
## Complete End-to-End Development & QA Testing Flow Guide

>

---

## 1. System Architecture & Role Hierarchy

```
                            ┌────────────────────────┐
                            │      SuperAdmin        │ (Platform Owner / SaaS Master)
                            └───────────┬────────────┘
                                        │ Onboards / Subscribes
                            ┌───────────▼────────────┐
                            │     Company Admin      │ (Tenant / Business Owner)
                            └─────┬────────────┬─────┘
                     Configures   │            │ Manages
          ┌───────────────────────┘            └───────────────────────┐
          ▼                                                            ▼
┌──────────────────┐                                         ┌──────────────────┐
│     HR Admin     │                                         │     Manager      │
└─────────┬────────┘                                         └─────────┬────────┘
          │ Approvals / Payroll                                        │ Team Tasks / Approvals
          └───────────────────────────┬────────────────────────────────┘
                                      ▼
                           ┌────────────────────┐
                           │      Employee      │ (Web Portal & Mobile App)
                           └────────────────────┘
```

### Role-Based Access Summary

| Role | Dashboard Route | Core Scope & Responsibilities |
| :--- | :--- | :--- |
| **SuperAdmin** | `/superadmin/dashboard` | Manage companies, approve/reject tenant registration requests, configure subscription plans, monitor platform revenue, payments, system audit logs, and global user management. |
| **CompanyAdmin** | `/company/dashboard` | Setup branches, departments, designations, staff onboarding, define attendance/shift rules, leave policies, payroll formulas, AI intelligence, and full access control. |
| **HR Admin** | `/hr/dashboard` | Employee lifecycle management, document verification, attendance regularizations, leave approvals, holiday calendars, payroll computation, and team announcements. |
| **Manager** | `/manager/dashboard` | Team oversight, team task assignment, track work progress on Kanban boards, approve team leaves, review team attendance, and manage assigned projects/leads. |
| **Employee** | `/employee/dashboard` | Daily GPS Punch-In/Out (Web & Android Mobile App), attendance history, regularization requests, leave applications, view payslips, task execution, and assigned leads management. |

---

## 2. End-to-End Functional Workflows

---

### Phase 1: Company Registration & Subscription Lifecycle
**Objective:** A new tenant signs up, gets verified, activates a subscription plan, and accesses the system.

```
[Landing Page / Register (/register)]
              │ (Fills Company Name, Admin Name, Business Email, Phone, Password)
              ▼
[Request Submitted to SuperAdmin Queue (/superadmin/company-requests)]
              │
      ┌───────┴────────────────────────┐
      ▼                                ▼
[Approve Request]                [Reject Request]
      │                                │
      ├─ Company Record Created in DB  └─ Rejection Reason sent via Email/SMS
      ├─ Subscription Plan Assigned
      ├─ Admin Credentials Activated
      ▼
[Company Admin Login (/login)]
```

#### Step-by-Step QA Verification (Test Steps):
1. Navigate to `/register` and submit a new company registration form. Verify validation rules (valid email format, 10-digit phone, password minimum 6 chars).
2. Log in as SuperAdmin (`/superadmin/company-requests`). Verify that the newly registered company appears in the **Pending Requests** list with accurate timestamp and details.
3. Click **Approve**, select an active Subscription Plan (e.g., Starter, Growth, Enterprise), and set the billing cycle.
4. Log out and navigate to `/login`. Sign in using the approved Company Admin credentials. Verify successful redirect to `/company/dashboard`.
5. **Edge Case Verification:** Attempt login with an unapproved or rejected company account. The system must display: `"Account is pending approval"` or `"Account inactive"`.
6. **Subscription Expiry Check:** When a company's subscription date passes the validity period, the `subscriptionMiddleware` must block access to protected modules and redirect to `/company/subscription`.

---

### Phase 2: Organization Master Setup
> ⚠️ **Prerequisite:** Company Admin must complete this configuration before adding employees to ensure correct data associations.

```
[Company Admin Dashboard]
        │
        ├── 1. Branches Setup (/company/branches)
        │      └── Name, Address, Geofence Center (Latitude & Longitude), Allowed Radius (e.g., 100 meters)
        │
        ├── 2. Departments Setup (/company/departments)
        │      └── IT, Human Resources, Sales, Marketing, Operations, Finance
        │
        ├── 3. Designations Setup (/company/designations)
        │      └── Software Engineer, Sales Manager, HR Executive, Team Lead
        │
        ├── 4. Attendance & Shift Rules (/company/attendance-settings)
        │      └── Shift Start Time, Shift End Time, Grace Period (e.g., 15 mins), Half-day Working Hours Cutoff
        │
        └── 5. Leave Policy & Types (/company/leave-balance)
               └── Paid Leave (PL), Casual Leave (CL), Sick Leave (SL), Maternity/Paternity Leave
```

#### Step-by-Step QA Verification (Test Steps):
1. **Branch Geofencing:** Create a new branch. Input precise GPS coordinates (Latitude/Longitude) and set the geofence radius to `100` meters. Ensure values are stored correctly.
2. **Departments & Designations:** Add multiple departments and designations. Verify uniqueness validation prevents duplicate entries.
3. **Shift Rules:** Configure standard work hours (e.g., 09:30 AM to 06:30 PM) with a 15-minute grace period. Verify that settings persist after page refresh.

---

### Phase 3: Staff Onboarding & Credentials Flow

```
[HR Admin / Company Admin]
        │
        ├── Personal Details: Full Name, Email, Phone, Date of Birth, Address
        ├── Organization Placement: Branch, Department, Designation, Joining Date, Reporting Manager
        ├── Role Assignment: "Employee" or "Manager"
        ├── Statutory & Banking: Account Number, IFSC, PAN, Aadhaar, UAN
        ├── Salary Structure Configuration: Monthly CTC, Basic, HRA, Allowances
        └── Document Upload: Resume, ID Proof, Address Proof, Offer Letter
        │
        ▼
[Employee Record Created & Credentials Generated]
        │
        ├── User login account linked with Role (Employee / Manager)
        ├── Welcome / Login notification sent with temporary password
        └── Status set to "Active"
```

#### Step-by-Step QA Verification (Test Steps):
1. Navigate to `/company/employees/add` or `/hr/employees/add`.
2. Fill all mandatory fields. Test email duplicate check by entering an existing user's email; verify that error `"Email already in use"` appears.
3. When selecting **Reporting Manager**, verify that only users with the `Manager` or `CompanyAdmin` role appear in the dropdown list.
4. Upload employee KYC documents (JPG, PNG, PDF formats under 5MB). Verify preview and download capability under `/company/upload-document`.
5. Log out and log in with the newly created employee credentials at `/login`. Confirm redirection to `/employee/dashboard`.

---

### Phase 4: Daily Attendance, Geofencing & Location Tracking Flow

```
[Employee opens Web Portal or Android APK]
                   │
                   ▼
          [Click "Punch In"]
                   │
    ┌──────────────┴──────────────────────────┐
    ▼                                         ▼
[Office Geofence Verification]         [Field Staff / Live Tracking]
    │                                         │
    ├─ Captures User's Current GPS            ├─ Continuous GPS Service runs in background
    ├─ Compares against Branch Lat/Lng        ├─ Location coordinates logged every 5-15 mins
    │                                         ├─ Total distance traveled (KM) calculated
    ├── If Distance <= Allowed Radius:        └─ Tracking Allowance auto-computed
    │   └── PUNCH SUCCESSFUL (Status: Present)
    │
    └── If Distance > Allowed Radius:
        └── PUNCH REJECTED ("You are outside office perimeter")
            └── Option to Submit "Regularization Request"
                   │
                   ▼
[Working Hours & Punch Out at Day End]
                   │
                   ▼
[System Computes Day Status: Present / Late Mark / Half Day / Overtime]
```

#### Step-by-Step QA Verification (Test Steps):
1. **Valid Punch In (Within Geofence):** Log in from inside the branch radius. Click Punch In. Verify that the badge changes to "Present" (Green) and the timestamp is recorded.
2. **Geofence Rejection (Outside Radius):** Simulate or test GPS coordinates 200 meters away from branch center. Click Punch In. Verify rejection message: `"You are outside the designated office premises"`.
3. **Late Mark Calculation:** Perform punch in 20 minutes past the shift start time (exceeding the 15-minute grace period). Verify that the attendance record shows the `Late` flag.
4. **Attendance Regularization:** If a punch was missed, the employee submits a Regularization Request at `/employee/attendance`. Verify that the request appears on the Manager/HR dashboard (`/company/regularization`) and that approving it updates the attendance status to "Present".
5. **Field Staff Tracking:** In the Android mobile app, verify that location updates are transmitted to `/company/location-tracking` and rendered on the timeline map.

---

### Phase 5: Leave Management & Approval Flow

```
[Employee submits Leave Application (/employee/leaves)]
        │ (Selects Leave Type: Casual/Sick/Paid, Date Range: From -> To, Reason)
        ▼
[System checks Leave Balance]
        │
    ┌───┴────────────────────────────────┐
    ▼                                    ▼
[Balance Available]              [Insufficient Balance]
    │                                    │
    ▼                                    └─ Warns user & marks as "Loss of Pay (LOP)"
[Notification sent to Reporting Manager & HR]
    │
    ├── Manager reviews at /manager/team-leaves
    │
    ├── [APPROVE]: Leave balance deducted, Attendance calendar displays "On Leave"
    └── [REJECT]: Reason recorded, Employee receives rejection notification
```

#### Step-by-Step QA Verification (Test Steps):
1. Apply for 2 days of Casual Leave as an employee. Verify that available balance decreases by 2 once approved.
2. Log in as the assigned Reporting Manager. Navigate to `/manager/team-leaves`. Approve the pending request.
3. Log back in as Employee; verify that leave status shows **Approved** and the dates appear highlighted on the attendance monthly view.
4. **Negative Test (Date Overlap):** Attempt to submit a new leave request for dates that already have an approved leave. System must show error: `"Leave already applied for the selected dates"`.

---

### Phase 6: Project & Kanban Task Management Flow

```
[Admin / Manager creates Project (/company/projects)]
        │
        ├── Create Task (Title, Description, Due Date, Priority: Low/Med/High/Urgent)
        ├── Assign to Employee(s)
        ▼
[Interactive Kanban Board Workflow (/company/tasks)]
        │
   [To Do] ───► [In Progress] ───► [In Review] ───► [Completed]
        │
        ├── Real-time notification delivered to assigned employee
        ├── Task details support task comments, checklist items, and attachments
        └── Task status changes update completion percentages on the project
```

#### Step-by-Step QA Verification (Test Steps):
1. As Manager, create a task and assign it to an employee with a future deadline.
2. As Employee, open `/employee/my-tasks`. Drag the task card from **To Do** to **In Progress**, then to **Completed**.
3. Verify that the task status change reflects immediately on the Manager's Kanban board.
4. **Overdue Task Alert:** Create a task with yesterday's due date. Confirm it is highlighted with an "Overdue" indicator.

---

### Phase 7: Lead Engine & WhatsApp CRM Automation Flow

```
[Lead Ingestion]
        │ (Manual Entry / Website Form Webhook / CSV Bulk Import)
        ▼
[Lead Assignment]
        │
        ├── Auto-assigned (Round-Robin) or Manually assigned to Sales Executive
        ▼
[Automated Engagement & Pipeline Stages (/company/leads)]
        │
        ├── Welcome WhatsApp Message triggered automatically via WhatsApp Cloud API
        ├── Follow-up date and reminder set
        ├── Pipeline Progression:
        │   New ──► Contacted ──► Qualified ──► Proposal Sent ──► Won / Lost
        ▼
[Delivery & Engagement Logs]
        │
        └── Message status recorded in DB: Sent, Delivered, Read, Failed
```

#### Step-by-Step QA Verification (Test Steps):
1. **Lead Creation:** Add a lead at `/company/leads` with an active WhatsApp mobile number (e.g., `+91XXXXXXXXXX`).
2. **Pipeline Transition:** Move lead from `New` to `Contacted`, then `Proposal Sent`. Verify pipeline summary counts update in real-time.
3. **Follow-up Reminders:** Set a reminder for the current date. Verify in-app reminder alert appears on the employee's dashboard.
4. **CSV Bulk Import:** Import a CSV with 50 leads. Ensure valid rows are imported and invalid rows (missing phone or invalid format) are reported with error line numbers.

---

### Phase 8: Payroll Computation & Payslip Generation Flow

```
[Month-End / Pay Run Processing (/company/payroll/generate)]
                 │
                 ▼
[Step 1: Attendance & Leave Data Synchronization]
                 │
                 ├─ Total Days in Month (e.g., 30)
                 ├─ Actual Present Days + Approved Paid Leaves + Paid Holidays
                 ├─ Late Mark Penalties / Half-Day Deductions
                 └─ Loss of Pay (LOP) / Unapproved Absent Days
                 │
                 ▼
[Step 2: Salary Advance & Loan Deductions]
                 │
                 └─ Active salary advances for the month are retrieved and deducted
                 │
                 ▼
[Step 3: Payroll Calculation Formula]
                 │
                 ├─ Gross Earnings = Basic + HRA + Special Allowances
                 ├─ Total Deductions = PF + Professional Tax (PT) + LOP Amount + Advance Repayment
                 └─ Net Payable Salary = Gross Earnings - Total Deductions
                 │
                 ▼
[Step 4: Publish Payroll & Payslip Generation]
                 │
                 ├── Status changed to "Published" / "Paid"
                 └── Employee downloads generated Payslip PDF from /employee/payslips
```

#### Step-by-Step QA Verification (Test Steps):
1. Configure employee salary structure at `/company/payroll/salary` (e.g., Gross = ₹50,000).
2. Record 2 days of unexcused absence (LOP) for the employee during the test month.
3. Approve a Salary Advance of ₹5,000 at `/company/payroll/advances`.
4. Run payroll generation at `/company/payroll/generate` for the month.
5. Verify mathematical accuracy on the draft payroll:
   - Deductions include: (Per-day salary × 2) + ₹5,000 advance + statutory taxes.
   - Net pay matches the expected calculated amount.
6. Click **Publish**. Log in as Employee (`/employee/payslips`) and download the PDF. Confirm company name, breakdown numbers, and formatting are correct.

---

### Phase 9: AI Growth & Business Intelligence Flow

```
[CRM & HRMS Data Aggregation]
                 │ (Attendance rates, Task completion velocity, Sales pipeline conversion)
                 ▼
       [AI Intelligence Engine]
                 │
                 ├── 1. Lead Leakage Detection: Unattended leads > 48 hours
                 ├── 2. Employee Productivity Index: Task completion vs. deadlines
                 ├── 3. Department Performance: Sales targets vs. actual closures
                 ├── 4. Root Cause Analysis: Pinpoints operational bottlenecks
                 ▼
[AI Dashboard Output (/company/ai-intelligence)]
                 │
                 ├── Executive Health Score (0 - 100%)
                 ├── Next Best Actions (High-priority action items for managers)
                 └── Training Needs Analysis (Skill gaps identified per employee)
```

#### Step-by-Step QA Verification (Test Steps):
1. Create 5 test leads and leave them without follow-up updates for several days.
2. Open `/company/ai-intelligence`.
3. Verify that the AI engine flags these leads under **Lead Leakage Warning** with recommended follow-up actions.
4. Click **Run AI Analysis** button. Ensure progress loader completes without HTTP 500 errors and updates the score card.

---

### Phase 10: Internal Requests & Support Ticket Hub
> Common ticketing portal across all roles (`/pages/common/CompanyRequestsPage.jsx`)

```
[Employee / Manager creates Ticket]
         │
         ├── Category: IT Support, HR Query, Payroll Correction, Infrastructure
         ├── Priority: Low / Medium / High / Urgent
         ├── Description & File Attachment
         ▼
[Assigned to Company Admin / HR Queue]
         │
         ├── Ticket Workflow: Open ──► In Progress ──► Resolved ──► Closed
         └── Internal communication thread & resolution note sent to requester
```

---

## 3. Comprehensive QA Test Matrix

| Test ID | Module | Test Scenario | Preconditions | Action / Test Steps | Expected Result | Pass / Fail |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-01** | Authentication | Login with wrong password | Active user exists | Enter wrong password on `/login` | Error: "Invalid credentials" displayed; no token issued. | [ ] |
| **TC-AUTH-02** | Authentication | Access protected page without token | Logged out | Navigate directly to `/company/dashboard` | Redirected to `/login`. | [ ] |
| **TC-AUTH-03** | Authorization | Role-based boundary check | Logged in as Employee | Navigate to `/superadmin/dashboard` | Redirected or 403 Forbidden shown. | [ ] |
| **TC-ATT-01** | Attendance | Valid punch in inside geofence | GPS inside office radius | Click "Punch In" button | Status changes to "Present" with current timestamp. | [ ] |
| **TC-ATT-02** | Attendance | Duplicate punch in prevention | Already punched in | Click "Punch In" again | Button disabled or displays "Already punched in". | [ ] |
| **TC-ATT-03** | Attendance | Geofence violation check | GPS outside office radius | Click "Punch In" | Error: "Out of office premises" displayed; punch blocked. | [ ] |
| **TC-ATT-04** | Attendance | Regularization request flow | Missed punch in record | Submit regularization from attendance page | Request appears in Admin queue; approving fixes record. | [ ] |
| **TC-LEV-01** | Leave | Apply leave within available balance | Available PL = 5 | Apply for 2 days PL | Status "Pending"; after approval, balance becomes 3. | [ ] |
| **TC-LEV-02** | Leave | Apply leave with zero balance | Available CL = 0 | Apply for 1 day CL | Warning shown; leave flagged as Unpaid (LOP). | [ ] |
| **TC-LEV-03** | Leave | Overlapping leave application | Approved leave exists | Apply for same date range | System displays validation error and blocks submission. | [ ] |
| **TC-TSK-01** | Tasks | Task creation and assignment | Employee exists | Create task with deadline and assign | Task appears in employee's task list with notification. | [ ] |
| **TC-TSK-02** | Tasks | Kanban board status update | Active assigned task | Drag card from To Do to In Progress | Status updates in DB and persists after page refresh. | [ ] |
| **TC-PAY-01** | Payroll | Salary calculation with LOP | Gross = 60,000, 2 LOP days | Generate monthly payroll | Per-day salary deducted for 2 days accurately. | [ ] |
| **TC-PAY-02** | Payroll | Salary advance deduction | Advance = 5,000 approved | Generate monthly payroll | Net pay reflects ₹5,000 deduction under advances. | [ ] |
| **TC-PAY-03** | Payroll | Payslip PDF generation | Published payroll | Click "Download Payslip" | PDF generates with clean formatting, logo, and breakdown. | [ ] |
| **TC-LED-01** | Leads | Add lead with duplicate phone | Lead with phone exists | Add new lead with same phone | Duplicate warning or info prompt is shown. | [ ] |
| **TC-LED-02** | Leads | WhatsApp template dispatch | WhatsApp Cloud API configured | Send welcome message to lead | Message status logged as "Sent" in WhatsApp logs. | [ ] |
| **TC-AI-01** | AI Intelligence | Bottleneck & leakage detection | Inactive leads exist | Run AI analysis | Leakage alerts and action suggestions render cleanly. | [ ] |

---

## 4. Critical Technical Caveats & Edge Cases for QA

1. **Dual Backend JWT Secret Synchronization:**
   - The CRM Core Backend runs on port `4000` (Node.js + MongoDB).
   - The Lead Automation Engine runs on port `5000` (Node.js + PostgreSQL + Redis).
   - **Critical:** Both backend `.env` files must have the **exact same** `JWT_ACCESS_SECRET`. If they mismatch, navigating to the Leads module will fail with `401 Unauthorized`.

2. **Mobile App Android Permissions:**
   - Background location tracking requires Android permissions:
     - `ACCESS_FINE_LOCATION`
     - `ACCESS_BACKGROUND_LOCATION` ("Allow all the time")
     - Battery Optimization set to **Unrestricted**.

3. **Timezone Uniformity:**
   - All punch logs, timestamps, and reports must be stored in UTC and rendered in **IST (UTC+5:30)**. Check that late marks are computed against local office time, not UTC server time.

4. **Payroll Prerequisites:**
   - An employee must have an active Salary Structure configured before payroll generation. If CTC is missing, the generator must flag that employee rather than crashing the batch process.

---

## 5. Test Environment & Credential Guidelines

### Base URLs:
- **Frontend Web App:** `http://localhost:5173` (or staging domain)
- **CRM Backend Health Check:** `http://localhost:4000/api/v1/health`
- **Lead Engine API:** `http://localhost:5000/api/leads-engine`

### Test Accounts Setup Matrix:
| Role | Recommended Test Email Format | Default Access Scope |
| :--- | :--- | :--- |
| **SuperAdmin** | `superadmin@oneclick.com` | Global platform administration |
| **CompanyAdmin** | `admin@testcompany.com` | Complete company-wide administration |
| **HR Manager** | `hr@testcompany.com` | Staff, attendance, leave, and payroll |
| **Manager** | `manager@testcompany.com` | Department team, tasks, and leave approvals |
| **Employee** | `employee@testcompany.com` | Punch in/out, tasks, personal leaves, payslips |

---
*Document Version: 1.0 (English Edition) | OneClick HRMS & AI CRM Platform*
