import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import Message from '../models/Message';
import Conversation from '../models/Conversation';
import User from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production';

interface AuthenticatedSocket extends Socket {
  user?: any;
}

export const setupSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST']
    }
  });

  // Socket Authentication Middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await User.findById(decoded.userId).select('-passwordHash');
      if (!user) {
        return next(new Error('User not found'));
      }
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.user.username}`);

    // Join user's personal room for direct messages/notifications
    socket.join(socket.user._id.toString());

    // Join a specific conversation room
    socket.on('join_conversation', async (conversationId: string) => {
      // Verify user is part of the conversation
      try {
        const conversation = await Conversation.findById(conversationId);
        if (conversation && (conversation.user1.equals(socket.user._id) || conversation.user2.equals(socket.user._id))) {
          socket.join(conversationId);
          console.log(`${socket.user.username} joined conversation ${conversationId}`);
        }
      } catch (err) {
        console.error('Join conversation error:', err);
      }
    });

    // Send message event
    socket.on('send_message', async (data: { conversationId: string, ciphertext: string, nonce: string }) => {
      try {
        const { conversationId, ciphertext, nonce } = data;
        
        // Save encrypted message to DB
        const newMessage = new Message({
          conversationId,
          senderId: socket.user._id,
          ciphertext,
          nonce
        });

        await newMessage.save();

        // Broadcast to everyone in the conversation (including sender, for confirmation)
        io.to(conversationId).emit('receive_message', {
          _id: newMessage._id,
          conversationId,
          senderId: socket.user._id,
          ciphertext,
          nonce,
          createdAt: newMessage.createdAt
        });
      } catch (err) {
        console.error('Send message error:', err);
      }
    });

    // Load past messages
    socket.on('load_messages', async (conversationId: string) => {
      try {
         const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
         socket.emit('past_messages', messages);
      } catch (err) {
        console.error('Load messages error:', err);
      }
    });

    // Typing indicators
    socket.on('typing_start', (conversationId: string) => {
      socket.to(conversationId).emit('typing_start', { conversationId, userId: socket.user._id });
    });

    socket.on('typing_stop', (conversationId: string) => {
      socket.to(conversationId).emit('typing_stop', { conversationId, userId: socket.user._id });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.username}`);
      // Handle online presence here if necessary
    });
  });
};
