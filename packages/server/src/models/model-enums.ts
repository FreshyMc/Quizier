export enum UserRole {
  PLAYER = 'PLAYER',
  ADMIN = 'ADMIN',
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export enum SubmissionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum GameStatus {
  WAITING = 'WAITING',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED',
}

export enum NotificationType {
  SUBMISSION_APPROVED = 'SUBMISSION_APPROVED',
  SUBMISSION_REJECTED = 'SUBMISSION_REJECTED',
  GAME_INVITE = 'GAME_INVITE',
  SYSTEM = 'SYSTEM',
}
