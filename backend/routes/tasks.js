const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const auth = require('../middleware/auth');

// Helper to broadcast websocket events
const emitChange = (req, eventName, data) => {
  const io = req.app.get('socketio');
  io.emit(eventName, data);
};

// Create Task
router.post('/', auth, async (req, res) => {
  try {
    const newTask = new Task({ ...req.body, user: req.user });
    await newTask.save();
    emitChange(req, 'taskCreated', newTask);
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Read User Tasks
router.get('/', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Task
router.put('/:id', auth, async (req, res) => {
  try {
    let task = await Task.findById(req.id || req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.user.toString() !== req.user) return res.status(401).json({ message: 'Unauthorized' });

    task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
    emitChange(req, 'taskUpdated', task);
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.user.toString() !== req.user) return res.status(401).json({ message: 'Unauthorized' });

    await task.deleteOne();
    emitChange(req, 'taskDeleted', req.params.id);
    res.json({ message: 'Task removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;