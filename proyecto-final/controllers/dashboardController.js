const Task = require('../models/Task');
const Subject = require('../models/Subject');

exports.index = async (req, res, next) => {
  try {
    const [stats, overview] = await Promise.all([Task.dashboard(req.user), Subject.overview(req.user)]);
    res.render('dashboard/index', { title: 'Dashboard', stats, overview });
  } catch (err) {
    next(err);
  }
};
