-- Create device_tokens table for Firebase Cloud Messaging push notifications
CREATE TABLE IF NOT EXISTS device_tokens (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  token LONGTEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  device_name VARCHAR(255),
  device_type VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP,
  UNIQUE KEY unique_user_token (user_id, token(100)),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_active (user_id, is_active),
  INDEX idx_created_at (created_at)
);

-- Create index for faster queries
CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_is_active ON device_tokens(is_active);
