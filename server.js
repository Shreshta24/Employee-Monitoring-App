const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const allowedOrigins = [
    'http://localhost:3000',
    'https://employee-monitoring-app.vercel.app',
    'https://employee-monitoring-app.onrender.com'
];

app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB Connection - REMOVED deprecated options
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['employee', 'employer'], required: true },
    department: { type: String },
    position: { type: String },
    createdAt: { type: Date, default: Date.now }
});

// Task Schema
const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
    dueDate: { type: Date },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
});

// Performance Schema
const performanceSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String },
    month: { type: String },
    year: { type: Number },
    tasksCompleted: { type: Number, default: 0 },
    tasksAssigned: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Task = mongoose.model('Task', taskSchema);
const Performance = mongoose.model('Performance', performanceSchema);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        res.status(403).json({ message: 'Invalid token' });
    }
};

// Routes

// Registration
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, role, department, position } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const user = new User({
            name,
            email,
            password: hashedPassword,
            role,
            department,
            position
        });

        await user.save();

        // Create initial performance record for employees
        if (role === 'employee') {
            const now = new Date();
            const performance = new Performance({
                employeeId: user._id,
                month: now.toLocaleString('default', { month: 'long' }),
                year: now.getFullYear(),
                tasksCompleted: 0,
                tasksAssigned: 0
            });
            await performance.save();
        }

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Find user
        const user = await User.findOne({ email, role });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

// Get employer dashboard data - FIXED VERSION
app.get('/api/employer/dashboard', authenticateToken, async (req, res) => {
    try {
        console.log('Employer dashboard request for user:', req.user);
        
        if (req.user.role !== 'employer') {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Get all employees - make sure we're getting all employees
        const employees = await User.find({ role: 'employee' }).select('-password');
        console.log(`Found ${employees.length} employees:`, employees.map(e => ({ name: e.name, email: e.email, id: e._id })));

        // Get tasks assigned by this employer
        const tasks = await Task.find({ assignedBy: req.user.id })
            .populate('assignedTo', 'name email department')
            .sort({ createdAt: -1 });

        console.log(`Found ${tasks.length} tasks`);

        // Get performance data for all employees
        const performances = await Performance.find()
            .populate('employeeId', 'name email department');

        // Calculate statistics
        const totalEmployees = employees.length;
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const pendingTasks = tasks.filter(t => t.status === 'pending').length;

        const responseData = {
            user: req.user,
            employees: employees, // Make sure this is included
            tasks: tasks,
            performances: performances,
            stats: {
                totalEmployees,
                totalTasks,
                completedTasks,
                pendingTasks,
                completionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0
            }
        };

        console.log('Sending response with employees:', responseData.employees.length);
        res.json(responseData);
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// Get employee dashboard data - FIXED VERSION
app.get('/api/employee/dashboard', authenticateToken, async (req, res) => {
    try {
        console.log('Employee dashboard request for user:', req.user);
        
        if (req.user.role !== 'employee') {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Get tasks with proper population
        const tasks = await Task.find({ assignedTo: req.user.id })
            .populate('assignedBy', 'name email')
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 });

        console.log(`Found ${tasks.length} tasks for employee ${req.user.name}:`, tasks);

        // Get performance data
        const performance = await Performance.findOne({ employeeId: req.user.id })
            .sort({ updatedAt: -1 });

        console.log('Performance data:', performance);

        // Calculate statistics
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === 'completed').length;
        const pendingTasks = tasks.filter(t => t.status === 'pending').length;
        const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;

        const responseData = {
            user: req.user,
            tasks: tasks,
            performance: performance || { 
                tasksCompleted: 0, 
                tasksAssigned: totalTasks,
                rating: '-'
            },
            stats: {
                totalTasks,
                completedTasks,
                pendingTasks,
                inProgressTasks,
                completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0
            }
        };

        console.log('Sending dashboard response:', responseData);
        res.json(responseData);
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// Assign task (employer only) - FIXED VERSION
app.post('/api/tasks/assign', authenticateToken, async (req, res) => {
    try {
        console.log('Task assignment request received:', req.body);
        console.log('User making request:', req.user);
        
        if (req.user.role !== 'employer') {
            return res.status(403).json({ message: 'Access denied. Only employers can assign tasks.' });
        }

        const { title, description, assignedTo, dueDate } = req.body;
        
        // Validate required fields
        if (!title || !description || !assignedTo || !dueDate) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if the assigned employee exists
        const employee = await User.findById(assignedTo);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        console.log('Creating task for employee:', employee.name);

        // Create the task
        const task = new Task({
            title,
            description,
            assignedTo: assignedTo,
            assignedBy: req.user.id,
            dueDate: new Date(dueDate),
            status: 'pending',
            createdAt: new Date()
        });

        await task.save();
        console.log('Task saved successfully:', task);

        // Update or create performance record for the employee
        let performance = await Performance.findOne({ employeeId: assignedTo });
        const now = new Date();
        const currentMonth = now.toLocaleString('default', { month: 'long' });
        const currentYear = now.getFullYear();
        
        if (!performance) {
            // Create new performance record
            performance = new Performance({
                employeeId: assignedTo,
                month: currentMonth,
                year: currentYear,
                tasksCompleted: 0,
                tasksAssigned: 1,
                updatedAt: now
            });
        } else {
            // Update existing performance record
            performance.tasksAssigned += 1;
            performance.updatedAt = now;
            // Update month/year if needed
            performance.month = currentMonth;
            performance.year = currentYear;
        }
        
        await performance.save();
        console.log('Performance record updated:', performance);

        // Populate the task with employee details for response
        const populatedTask = await Task.findById(task._id)
            .populate('assignedTo', 'name email')
            .populate('assignedBy', 'name email');

        res.status(201).json({ 
            message: 'Task assigned successfully', 
            task: populatedTask 
        });
    } catch (error) {
        console.error('Task assignment error:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// Update task status (employee only)
app.put('/api/tasks/:taskId/status', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'employee') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const { status } = req.body;
        const task = await Task.findById(req.params.taskId);

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        if (task.assignedTo.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Access denied' });
        }

        task.status = status;
        if (status === 'completed') {
            task.completedAt = new Date();
            
            // Update performance
            const performance = await Performance.findOne({ employeeId: req.user.id });
            if (performance) {
                performance.tasksCompleted += 1;
                await performance.save();
            }
        }

        await task.save();

        res.json({ message: 'Task status updated', task });
    } catch (error) {
        console.error('Task update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard/employee', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard', 'employee-dashboard.html'));
});

app.get('/dashboard/employer', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard', 'employer-dashboard.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
// Debug endpoint to check all users (add this temporarily)
app.get('/api/debug/users', async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        const employees = users.filter(u => u.role === 'employee');
        const employers = users.filter(u => u.role === 'employer');
        
        res.json({
            total: users.length,
            employees: {
                count: employees.length,
                data: employees
            },
            employers: {
                count: employers.length,
                data: employers
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test ping endpoint for tab monitoring
app.get('/api/test/ping', authenticateToken, (req, res) => {
    res.json({ 
        status: 'active', 
        timestamp: new Date().toISOString(),
        user: req.user 
    });
});

// Debug endpoint to check all tasks
app.get('/api/debug/tasks', async (req, res) => {
    try {
        const tasks = await Task.find({})
            .populate('assignedTo', 'name email')
            .populate('assignedBy', 'name email')
            .sort({ createdAt: -1 });
        
        res.json({
            total: tasks.length,
            tasks: tasks
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint for employer dashboard data
app.get('/api/test/employer-dashboard', async (req, res) => {
    try {
        const employees = await User.find({ role: 'employee' }).select('-password');
        res.json({ employees });
    } catch (error) {
        console.error('Error fetching employees for test:', error);
        res.status(500).json({ message: 'Server error' });
    }
});