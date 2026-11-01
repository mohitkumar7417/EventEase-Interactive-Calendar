EventEase – Interactive Calendar

EventEase is a task and event management application developed as a college mini project. It helps users organize their tasks, manage subtasks, track deadlines, and receive automatic email reminders for upcoming and overdue tasks.

Features

- Add, view, edit, and delete tasks.
- Add and manage subtasks.
- Mark tasks and subtasks as completed or pending.
- Set task descriptions, due dates, and priorities.
- Filter tasks by status and priority.
- Store task data in CouchDB.
- Automatically send Gmail reminders for upcoming and overdue tasks.
- Prevent duplicate reminder emails.
- Recover missed reminders when the server restarts.
- Responsive and user-friendly interface.

Technologies Used

Frontend

- HTML
- CSS
- JavaScript

Backend

- Node.js
- Express.js
- REST API (GET, POST, PUT, DELETE)

Database

- Apache CouchDB
- Nano (Node.js CouchDB client)

Additional Tools

- Nodemailer (email notifications)
- Node-Cron (scheduled reminders)
- Dotenv (environment variable management)
- Git and GitHub

Project Structure

EventEase-Interactive-Calendar/
│
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── server.js
├── package.json
├── package-lock.json
├── .gitignore
└── README.md

Installation and Setup

1. Clone the Repository

git clone https://github.com/mohitkumar7417/EventEase-Interactive-Calendar.git

2. Open the Project Folder

cd EventEase-Interactive-Calendar

3. Install Dependencies

npm install

4. Install and Configure CouchDB

- Install Apache CouchDB on your computer.
- Start the CouchDB service.
- Open Fauxton at "http://localhost:5984/_utils/".
- Create a database named "eventease".

5. Configure Environment Variables

Create a ".env" file in the root project folder.

Add your own configuration:

EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
COUCHDB_USER=your_couchdb_username
COUCHDB_PASSWORD=your_couchdb_password

Important: Use a Gmail App Password for email notifications. Never upload your ".env" file or share your passwords publicly.

6. Start the Application

npm start

Open your browser and visit:

http://localhost:3000

Automatic Email Reminders

EventEase provides five automatic email reminder stages for pending tasks:

1. Two days before the due date – 9:00 AM.
2. One day before the due date – 9:00 AM.
3. On the due date – 8:00 AM.
4. One day after the due date – 9:00 AM.
5. Two days after the due date – 9:00 AM.

Completed tasks do not receive further reminders.

Note: Automatic reminders require the backend server to be running, the computer to be awake, and an active internet connection.

API Operations

The application uses REST API methods:

Method| Purpose
GET| Retrieve tasks
POST| Create tasks
PUT| Update tasks
DELETE| Delete tasks

Database

EventEase uses Apache CouchDB to store task information persistently, including:

- Task title and description
- Due date
- Priority
- Completion status
- Subtasks
- Reminder tracking information

Task data remains saved even after the application server is restarted.

Security

- Environment variables are used for sensitive credentials.
- ".env" is excluded through ".gitignore".
- "node_modules/" is excluded from the GitHub repository.
- Users should keep their Gmail App Password and CouchDB credentials private.

Future Improvements

- Full interactive monthly calendar view.
- User authentication and individual accounts.
- Cloud deployment and online access.
- Mobile application support.

Author

Mohit Kumar

College Mini Project

Project Name: EventEase – Interactive Calendar

---

EventEase – Organize your tasks, manage your time, and never miss an important deadline!
