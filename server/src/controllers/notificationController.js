import { Notification } from "../models/Notification.js";
import { NotFoundError } from "../errors/AppError.js";

/**
 * Retrieves notifications visible to the authenticated user.
 */
export async function getNotificationsHandler(req, res) {
  const user = req.user;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  const unreadOnly = req.query.unreadOnly === "true";

  const filter = {
    $or: [{ targetRoles: user.role }, { targetUser: user._id }]
  };

  if (unreadOnly) {
    filter["readBy.user"] = { $ne: user._id };
  }

  const unreadFilter = {
    $or: [{ targetRoles: user.role }, { targetUser: user._id }],
    "readBy.user": { $ne: user._id }
  };

  const [total, rawList, unreadCount] = await Promise.all([
    Notification.countDocuments(filter),
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(unreadFilter)
  ]);

  const notifications = rawList.map((item) => ({
    ...item,
    isRead: (item.readBy || []).some((r) => r.user && r.user.toString() === user._id.toString())
  }));

  res.status(200).json({
    status: "success",
    data: {
      notifications,
      unreadCount,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1
      }
    }
  });
}

/**
 * Marks a single notification as read by the user.
 */
export async function markNotificationAsReadHandler(req, res) {
  const { id } = req.params;
  const user = req.user;

  const notification = await Notification.findOne({
    _id: id,
    $or: [{ targetRoles: user.role }, { targetUser: user._id }]
  });

  if (!notification) {
    throw new NotFoundError("Notification not found or access denied");
  }

  const alreadyRead = notification.readBy.some((r) => r.user.toString() === user._id.toString());

  if (!alreadyRead) {
    notification.readBy.push({ user: user._id, readAt: new Date() });
    await notification.save();
  }

  res.status(200).json({
    status: "success",
    data: {
      notification: {
        ...notification.toJSON(),
        isRead: true
      }
    }
  });
}

/**
 * Marks all notifications for the user as read.
 */
export async function markAllNotificationsAsReadHandler(req, res) {
  const user = req.user;

  const filter = {
    $or: [{ targetRoles: user.role }, { targetUser: user._id }],
    "readBy.user": { $ne: user._id }
  };

  await Notification.updateMany(filter, {
    $push: {
      readBy: { user: user._id, readAt: new Date() }
    }
  });

  res.status(200).json({
    status: "success",
    message: "All notifications marked as read"
  });
}
