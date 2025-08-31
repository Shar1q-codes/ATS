import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

interface UserPresence {
  userId: string;
  socketIds: Set<string>;
  lastSeen: Date;
  currentApplications: Set<string>;
}

interface ApplicationViewer {
  userId: string;
  name: string;
  joinedAt: Date;
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private readonly userPresence = new Map<string, UserPresence>();
  private readonly applicationViewers = new Map<
    string,
    Map<string, ApplicationViewer>
  >();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async setUserOnline(userId: string, socketId: string): Promise<void> {
    let presence = this.userPresence.get(userId);

    if (!presence) {
      presence = {
        userId,
        socketIds: new Set(),
        lastSeen: new Date(),
        currentApplications: new Set(),
      };
      this.userPresence.set(userId, presence);
    }

    presence.socketIds.add(socketId);
    presence.lastSeen = new Date();

    this.logger.debug(`User ${userId} online with socket ${socketId}`);
  }

  async setUserOffline(userId: string, socketId: string): Promise<void> {
    const presence = this.userPresence.get(userId);

    if (presence) {
      presence.socketIds.delete(socketId);
      presence.lastSeen = new Date();

      // If no more socket connections, remove from all applications
      if (presence.socketIds.size === 0) {
        // Remove from all applications they were viewing
        presence.currentApplications.forEach((applicationId) => {
          this.removeUserFromApplication(userId, applicationId);
        });

        this.userPresence.delete(userId);
      }
    }

    this.logger.debug(`User ${userId} offline from socket ${socketId}`);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const presence = this.userPresence.get(userId);
    return presence ? presence.socketIds.size > 0 : false;
  }

  async getUserSockets(userId: string): Promise<string[]> {
    const presence = this.userPresence.get(userId);
    return presence ? Array.from(presence.socketIds) : [];
  }

  async getOnlineUsers(): Promise<string[]> {
    return Array.from(this.userPresence.keys()).filter((userId) => {
      const presence = this.userPresence.get(userId);
      return presence && presence.socketIds.size > 0;
    });
  }

  async setUserViewingApplication(
    userId: string,
    applicationId: string,
  ): Promise<void> {
    // Update user presence
    const presence = this.userPresence.get(userId);
    if (presence) {
      presence.currentApplications.add(applicationId);
    }

    // Update application viewers
    let viewers = this.applicationViewers.get(applicationId);
    if (!viewers) {
      viewers = new Map();
      this.applicationViewers.set(applicationId, viewers);
    }

    // Get user details
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'firstName', 'lastName'],
    });

    if (user) {
      viewers.set(userId, {
        userId,
        name: `${user.firstName} ${user.lastName}`,
        joinedAt: new Date(),
      });
    }

    this.logger.debug(`User ${userId} viewing application ${applicationId}`);
  }

  async removeUserFromApplication(
    userId: string,
    applicationId: string,
  ): Promise<void> {
    // Update user presence
    const presence = this.userPresence.get(userId);
    if (presence) {
      presence.currentApplications.delete(applicationId);
    }

    // Update application viewers
    const viewers = this.applicationViewers.get(applicationId);
    if (viewers) {
      viewers.delete(userId);

      // Clean up empty application viewer maps
      if (viewers.size === 0) {
        this.applicationViewers.delete(applicationId);
      }
    }

    this.logger.debug(
      `User ${userId} stopped viewing application ${applicationId}`,
    );
  }

  async getApplicationViewers(
    applicationId: string,
  ): Promise<ApplicationViewer[]> {
    const viewers = this.applicationViewers.get(applicationId);
    return viewers ? Array.from(viewers.values()) : [];
  }

  async getUserCurrentApplications(userId: string): Promise<string[]> {
    const presence = this.userPresence.get(userId);
    return presence ? Array.from(presence.currentApplications) : [];
  }

  // Cleanup method to remove stale presence data
  async cleanupStalePresence(): Promise<void> {
    const now = new Date();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [userId, presence] of this.userPresence.entries()) {
      if (now.getTime() - presence.lastSeen.getTime() > staleThreshold) {
        // Remove from all applications
        presence.currentApplications.forEach((applicationId) => {
          this.removeUserFromApplication(userId, applicationId);
        });

        this.userPresence.delete(userId);
        this.logger.debug(`Cleaned up stale presence for user ${userId}`);
      }
    }
  }

  // Get presence statistics
  async getPresenceStats(): Promise<{
    totalOnlineUsers: number;
    totalApplicationsBeingViewed: number;
    averageViewersPerApplication: number;
  }> {
    const totalOnlineUsers = this.userPresence.size;
    const totalApplicationsBeingViewed = this.applicationViewers.size;

    let totalViewers = 0;
    for (const viewers of this.applicationViewers.values()) {
      totalViewers += viewers.size;
    }

    const averageViewersPerApplication =
      totalApplicationsBeingViewed > 0
        ? totalViewers / totalApplicationsBeingViewed
        : 0;

    return {
      totalOnlineUsers,
      totalApplicationsBeingViewed,
      averageViewersPerApplication,
    };
  }
}
