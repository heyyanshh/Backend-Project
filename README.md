# E-Vote System

## Description
A secure, full-stack E-Voting System designed for transparent and tamper-proof elections. It utilizes a blockchain-like **SHA-256 hash chaining** mechanism to ensure vote integrity. Built with a minimalist and fast Vanilla JS frontend, an Express/Node.js backend, and a MongoDB database, the system sports a premium glassmorphic UI with dynamic dark/light themes. 

**Key Features:**
- 🛡️ **Vote Integrity**: SHA-256 hash chain verification to prevent tampering.
- 👥 **Role-Based Access Control (RBAC)**: Distinct User and Admin dashboards.
- 🌗 **Premium UI**: Responsive, glassmorphic design featuring dark/light mode toggles.
- 📊 **Real-time Analytics**: Admin Panel with registered voter counts, turnout tracking, and statistical insights.
- 🏆 **Multi-candidate Logic**: Fully functional election logic with automated winner announcements.

## Installation
Follow these steps to set up the project locally:

1. **Clone the repository**
   ```bash
   git clone https://github.com/heyyanshh/E-vote_System.git
   cd "E-Vote System Project "
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory and add your configuration details:
   ```env
   PORT=3000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key
   ```

4. **Start the Application**
   ```bash
   npm start
   ```

## Usage
Once the server is running, visit `http://localhost:3000` in your web browser.

- **Voters**: Register your account to vote in active elections.
- **Admins**: Use the default seeded Admin account (`admin@evote.com` / `Admin@123`) to create elections, manage candidates, and view secure audit logs.

## Current Progress Tracker
- [x] Integrate SHA-256 Hash Chaining
- [x] Configure Light/Dark Mode Toggle
- [x] Finalize Glassmorphism UI tweaks
- [x] Clean and sanitize Github Repo Push
- [ ] Add Multi-factor authentication (Planned Feature)

## Contributing
Developer contributions are highly encouraged. Please follow the standard Github flow:
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License
MIT License

## Contact
Email: rishu51010@gmail.com
GitHub: [@heyyanshh](https://github.com/heyyanshh)
