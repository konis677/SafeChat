import { Request, Response } from 'express';
import crypto from 'crypto';
import Invite from '../models/Invite';
import Conversation from '../models/Conversation';
import { AuthRequest } from '../middlewares/authMiddleware';

const generateInviteCode = () => {
  return 'INV-' + crypto.randomBytes(4).toString('hex').toUpperCase();
};

export const createInvite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user._id;

    const code = generateInviteCode();
    const newInvite = new Invite({
      code,
      createdBy: userId,
    });

    await newInvite.save();

    res.status(201).json({
      message: 'Invite created successfully',
      invite: newInvite
    });
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const useInvite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user._id;
    const { code } = req.body;

    if (!code) {
      res.status(400).json({ error: 'Invite code is required' });
      return;
    }

    const invite = await Invite.findOne({ code });
    
    if (!invite) {
      res.status(404).json({ error: 'Invalid invite code' });
      return;
    }

    if (invite.used) {
      res.status(400).json({ error: 'Invite code has already been used' });
      return;
    }

    if (invite.createdBy.equals(userId)) {
      res.status(400).json({ error: 'You cannot use your own invite code' });
      return;
    }

    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      $or: [
        { user1: invite.createdBy, user2: userId },
        { user1: userId, user2: invite.createdBy }
      ]
    });

    if (existingConversation) {
      res.status(400).json({ error: 'Conversation already exists with this user' });
      return;
    }

    // Mark invite as used
    invite.used = true;
    invite.usedBy = userId;
    await invite.save();

    // Create a conversation
    const newConversation = new Conversation({
      user1: invite.createdBy,
      user2: userId
    });

    await newConversation.save();

    res.status(200).json({
      message: 'Invite used successfully, conversation created',
      conversation: newConversation
    });
  } catch (error) {
    console.error('Use invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user._id;
    
    const conversations = await Conversation.find({
      $or: [{ user1: userId }, { user2: userId }]
    }).populate('user1', 'username publicKey').populate('user2', 'username publicKey');

    res.status(200).json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
