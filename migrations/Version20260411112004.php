<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260411112004 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('DROP TABLE ai_beat_suggestion');
        $this->addSql('DROP TABLE ai_harmonization');
        $this->addSql('DROP TABLE ai_mix_recommendation');
        $this->addSql('DROP TABLE ai_mood_music');
        $this->addSql('DROP TABLE beat');
        $this->addSql('DROP TABLE digital_track');
        $this->addSql('DROP TABLE drawing_comment');
        $this->addSql('DROP TABLE featured_track');
        $this->addSql('DROP TABLE loop_track');
        $this->addSql('DROP TABLE mix_project');
        $this->addSql('DROP TABLE shared_track');
        $this->addSql('DROP TABLE sound_effect');
        $this->addSql('DROP TABLE track_comment');
        $this->addSql('DROP TABLE track_like');
        $this->addSql('ALTER TABLE activity CHANGE name name VARCHAR(255) DEFAULT NULL, CHANGE day day VARCHAR(255) DEFAULT NULL, CHANGE time time VARCHAR(255) DEFAULT NULL, CHANGE supervisor supervisor VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE activity_modules ADD supervisor_name VARCHAR(100) DEFAULT NULL, DROP supervisorName, CHANGE emoji emoji VARCHAR(50) DEFAULT NULL, CHANGE status status VARCHAR(20) DEFAULT \'ACTIVE\' NOT NULL');
        $this->addSql('ALTER TABLE chapter CHANGE title title VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE chapter ADD CONSTRAINT FK_F981B52EAA5D4036 FOREIGN KEY (story_id) REFERENCES story (id)');
        $this->addSql('CREATE INDEX IDX_F981B52EAA5D4036 ON chapter (story_id)');
        $this->addSql('ALTER TABLE comments CHANGE content content LONGTEXT DEFAULT NULL, CHANGE created_at created_at DATETIME DEFAULT NULL');
        $this->addSql('ALTER TABLE comments ADD CONSTRAINT FK_5F9E962AE85286B2 FOREIGN KEY (pixel_art_id) REFERENCES pixel_art (id)');
        $this->addSql('ALTER TABLE comments ADD CONSTRAINT FK_5F9E962AC6ACA2AD FOREIGN KEY (shape_3d_id) REFERENCES shapes_3d (id)');
        $this->addSql('ALTER TABLE comments ADD CONSTRAINT FK_5F9E962A4B89032C FOREIGN KEY (post_id) REFERENCES posts (id)');
        $this->addSql('ALTER TABLE comments ADD CONSTRAINT FK_5F9E962AA76ED395 FOREIGN KEY (user_id) REFERENCES user (id)');
        $this->addSql('CREATE INDEX IDX_5F9E962AE85286B2 ON comments (pixel_art_id)');
        $this->addSql('CREATE INDEX IDX_5F9E962AC6ACA2AD ON comments (shape_3d_id)');
        $this->addSql('CREATE INDEX IDX_5F9E962A4B89032C ON comments (post_id)');
        $this->addSql('CREATE INDEX IDX_5F9E962AA76ED395 ON comments (user_id)');
        $this->addSql('ALTER TABLE contribution_version CHANGE author_name author_name VARCHAR(255) DEFAULT NULL, CHANGE content content LONGTEXT DEFAULT NULL, CHANGE version_message version_message LONGTEXT DEFAULT NULL');
        $this->addSql('ALTER TABLE contribution_version ADD CONSTRAINT FK_FE3DA302166053B4 FOREIGN KEY (scene_id) REFERENCES scene (id)');
        $this->addSql('CREATE INDEX IDX_FE3DA302166053B4 ON contribution_version (scene_id)');
        $this->addSql('ALTER TABLE drawing CHANGE title title VARCHAR(255) DEFAULT NULL, CHANGE description description LONGTEXT DEFAULT NULL, CHANGE created_at created_at DATETIME DEFAULT NULL, CHANGE published published TINYINT DEFAULT 0 NOT NULL');
        $this->addSql('ALTER TABLE drawing ADD CONSTRAINT FK_996B9FE7A76ED395 FOREIGN KEY (user_id) REFERENCES user (id)');
        $this->addSql('CREATE INDEX IDX_996B9FE7A76ED395 ON drawing (user_id)');
        $this->addSql('ALTER TABLE drawing_tag CHANGE drawing_id drawing_id INT NOT NULL, CHANGE tag_id tag_id INT NOT NULL, ADD PRIMARY KEY (drawing_id, tag_id)');
        $this->addSql('ALTER TABLE drawing_tag ADD CONSTRAINT FK_FCDFB1B9E6552D89 FOREIGN KEY (drawing_id) REFERENCES drawing (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE drawing_tag ADD CONSTRAINT FK_FCDFB1B9BAD26311 FOREIGN KEY (tag_id) REFERENCES tag (id) ON DELETE CASCADE');
        $this->addSql('CREATE INDEX IDX_FCDFB1B9E6552D89 ON drawing_tag (drawing_id)');
        $this->addSql('CREATE INDEX IDX_FCDFB1B9BAD26311 ON drawing_tag (tag_id)');
        $this->addSql('ALTER TABLE drawing_like ADD CONSTRAINT FK_6A90CF07E6552D89 FOREIGN KEY (drawing_id) REFERENCES drawing (id)');
        $this->addSql('ALTER TABLE drawing_like ADD CONSTRAINT FK_6A90CF07A76ED395 FOREIGN KEY (user_id) REFERENCES user (id)');
        $this->addSql('CREATE INDEX IDX_6A90CF07E6552D89 ON drawing_like (drawing_id)');
        $this->addSql('CREATE INDEX IDX_6A90CF07A76ED395 ON drawing_like (user_id)');
        $this->addSql('ALTER TABLE layer CHANGE name name VARCHAR(255) DEFAULT NULL, CHANGE visible visible TINYINT DEFAULT 1 NOT NULL');
        $this->addSql('ALTER TABLE layer ADD CONSTRAINT FK_E4DB211AE6552D89 FOREIGN KEY (drawing_id) REFERENCES drawing (id)');
        $this->addSql('CREATE INDEX IDX_E4DB211AE6552D89 ON layer (drawing_id)');
        $this->addSql('ALTER TABLE likes ADD CONSTRAINT FK_49CA4E7D4B89032C FOREIGN KEY (post_id) REFERENCES posts (id)');
        $this->addSql('ALTER TABLE likes ADD CONSTRAINT FK_49CA4E7DA76ED395 FOREIGN KEY (user_id) REFERENCES user (id)');
        $this->addSql('CREATE INDEX IDX_49CA4E7D4B89032C ON likes (post_id)');
        $this->addSql('CREATE INDEX IDX_49CA4E7DA76ED395 ON likes (user_id)');
        $this->addSql('CREATE UNIQUE INDEX unique_post_user_like ON likes (post_id, user_id)');
        $this->addSql('ALTER TABLE museum CHANGE title title VARCHAR(255) DEFAULT NULL, CHANGE author_name author_name VARCHAR(255) DEFAULT NULL, CHANGE description description LONGTEXT DEFAULT NULL, CHANGE genre genre VARCHAR(100) DEFAULT NULL, CHANGE full_content full_content LONGTEXT DEFAULT NULL');
        $this->addSql('ALTER TABLE museum ADD CONSTRAINT FK_62474477AA5D4036 FOREIGN KEY (story_id) REFERENCES story (id)');
        $this->addSql('CREATE INDEX IDX_62474477AA5D4036 ON museum (story_id)');
        $this->addSql('ALTER TABLE museum_submissions CHANGE type type VARCHAR(50) DEFAULT NULL, CHANGE status status VARCHAR(50) DEFAULT NULL, CHANGE image_path image_path VARCHAR(255) DEFAULT NULL, CHANGE title title VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE pixel_art CHANGE name name VARCHAR(255) DEFAULT NULL, CHANGE image_path image_path VARCHAR(255) DEFAULT NULL, CHANGE likes likes INT DEFAULT 0 NOT NULL');
        $this->addSql('ALTER TABLE post_tags CHANGE tag tag VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE post_tags ADD CONSTRAINT FK_A6E9F32D4B89032C FOREIGN KEY (post_id) REFERENCES posts (id)');
        $this->addSql('CREATE INDEX IDX_A6E9F32D4B89032C ON post_tags (post_id)');
        $this->addSql('ALTER TABLE posts CHANGE description description LONGTEXT DEFAULT NULL, CHANGE image_path image_path VARCHAR(255) DEFAULT NULL, CHANGE magic_sparks magic_sparks INT DEFAULT 0 NOT NULL');
        $this->addSql('ALTER TABLE posts ADD CONSTRAINT FK_885DBAFAF675F31B FOREIGN KEY (author_id) REFERENCES user (id)');
        $this->addSql('ALTER TABLE posts ADD CONSTRAINT FK_885DBAFA81C06096 FOREIGN KEY (activity_id) REFERENCES activity (id)');
        $this->addSql('CREATE INDEX IDX_885DBAFAF675F31B ON posts (author_id)');
        $this->addSql('CREATE INDEX IDX_885DBAFA81C06096 ON posts (activity_id)');
        $this->addSql('ALTER TABLE scene CHANGE title title VARCHAR(255) DEFAULT NULL, CHANGE content content LONGTEXT DEFAULT NULL, CHANGE status status VARCHAR(50) DEFAULT NULL');
        $this->addSql('ALTER TABLE scene ADD CONSTRAINT FK_D979EFDA579F4768 FOREIGN KEY (chapter_id) REFERENCES chapter (id)');
        $this->addSql('CREATE INDEX IDX_D979EFDA579F4768 ON scene (chapter_id)');
        $this->addSql('ALTER TABLE shapes_3d CHANGE shape_type shape_type VARCHAR(255) DEFAULT NULL, CHANGE color color VARCHAR(255) DEFAULT NULL, CHANGE texture texture VARCHAR(255) DEFAULT NULL, CHANGE image_path image_path VARCHAR(255) DEFAULT NULL, CHANGE likes likes INT DEFAULT 0 NOT NULL');
        $this->addSql('ALTER TABLE story CHANGE title title VARCHAR(255) DEFAULT NULL, CHANGE genre genre VARCHAR(100) DEFAULT NULL, CHANGE status status VARCHAR(50) DEFAULT NULL, CHANGE cover_image cover_image VARCHAR(255) DEFAULT NULL, CHANGE content content LONGTEXT DEFAULT NULL');
        $this->addSql('ALTER TABLE tag CHANGE name name VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE user ADD first_name VARCHAR(255) DEFAULT NULL, ADD last_name VARCHAR(255) DEFAULT NULL, DROP firstName, DROP lastName, CHANGE email email VARCHAR(255) DEFAULT NULL, CHANGE password password VARCHAR(255) DEFAULT NULL, CHANGE age age INT DEFAULT 0 NOT NULL, CHANGE role role VARCHAR(50) DEFAULT NULL, CHANGE points points INT DEFAULT 0 NOT NULL, CHANGE level level INT DEFAULT 1 NOT NULL, CHANGE xp xp INT DEFAULT 0 NOT NULL, CHANGE blocked blocked TINYINT DEFAULT 0 NOT NULL');
        $this->addSql('CREATE UNIQUE INDEX UNIQ_8D93D649E7927C74 ON user (email)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE ai_beat_suggestion (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, bpm INT NOT NULL, genre VARCHAR(100) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_general_ci`, mood VARCHAR(100) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_general_ci`, confidence_score DOUBLE PRECISION DEFAULT \'0\', created_at DATETIME DEFAULT \'current_timestamp()\' NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_general_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE ai_harmonization (id INT AUTO_INCREMENT NOT NULL, track_id INT NOT NULL, music_key VARCHAR(10) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, scale VARCHAR(50) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, chord_progression VARCHAR(500) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_general_ci`, suggested_harmony VARCHAR(500) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_general_ci`, created_at DATETIME DEFAULT \'current_timestamp()\' NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_general_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE ai_mix_recommendation (id INT AUTO_INCREMENT NOT NULL, project_id INT NOT NULL, recommendation_type VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, description TEXT CHARACTER SET utf8mb4 DEFAULT NULL COLLATE `utf8mb4_general_ci`, priority VARCHAR(20) CHARACTER SET utf8mb4 DEFAULT \'\'\'MEDIUM\'\'\' COLLATE `utf8mb4_general_ci`, created_at DATETIME DEFAULT \'current_timestamp()\' NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_general_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE ai_mood_music (id INT AUTO_INCREMENT NOT NULL, mood VARCHAR(100) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, tempo INT NOT NULL, music_key VARCHAR(10) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_general_ci`, suggested_instruments VARCHAR(500) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_general_ci`, generated_file_path VARCHAR(500) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_general_ci`, created_at DATETIME DEFAULT \'current_timestamp()\' NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_general_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE beat (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, bpm INT DEFAULT NULL, file_path VARCHAR(500) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_general_ci`, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_general_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE digital_track (id INT AUTO_INCREMENT NOT NULL, title VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, duration DOUBLE PRECISION DEFAULT \'NULL\', file_path VARCHAR(500) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_general_ci`, genre VARCHAR(100) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_general_ci`, user_id INT DEFAULT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_general_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE drawing_comment (id INT AUTO_INCREMENT NOT NULL, content TEXT CHARACTER SET utf8mb4 DEFAULT NULL COLLATE `utf8mb4_general_ci`, created_at DATETIME DEFAULT \'current_timestamp()\' NOT NULL, drawing_id INT DEFAULT NULL, user_id INT DEFAULT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_general_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE featured_track (id INT AUTO_INCREMENT NOT NULL, track_id INT NOT NULL, featured_at DATETIME DEFAULT \'current_timestamp()\' NOT NULL, feature_reason VARCHAR(500) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_general_ci`, display_order INT DEFAULT 0, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_general_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE loop_track (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, key_tone VARCHAR(50) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_general_ci`, duration DOUBLE PRECISION DEFAULT \'NULL\', file_path VARCHAR(500) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_general_ci`, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_general_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE mix_project (id INT AUTO_INCREMENT NOT NULL, project_name VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, created_at DATETIME DEFAULT \'current_timestamp()\' NOT NULL, updated_at DATETIME DEFAULT \'current_timestamp()\' NOT NULL, user_id INT DEFAULT NULL, status VARCHAR(50) CHARACTER SET utf8mb4 DEFAULT \'\'\'en cours\'\'\' COLLATE `utf8mb4_general_ci`, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_general_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE shared_track (id INT AUTO_INCREMENT NOT NULL, track_id INT NOT NULL, user_id INT DEFAULT 1 NOT NULL, shared_at DATETIME DEFAULT \'current_timestamp()\' NOT NULL, description TEXT CHARACTER SET utf8mb4 DEFAULT NULL COLLATE `utf8mb4_general_ci`, is_public TINYINT DEFAULT 1, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_general_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE sound_effect (id INT AUTO_INCREMENT NOT NULL, name VARCHAR(255) CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, category VARCHAR(100) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_general_ci`, file_path VARCHAR(500) CHARACTER SET utf8mb4 DEFAULT \'NULL\' COLLATE `utf8mb4_general_ci`, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_general_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE track_comment (id INT AUTO_INCREMENT NOT NULL, track_id INT NOT NULL, user_id INT DEFAULT 1 NOT NULL, comment_text TEXT CHARACTER SET utf8mb4 NOT NULL COLLATE `utf8mb4_general_ci`, created_at DATETIME DEFAULT \'current_timestamp()\' NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_general_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('CREATE TABLE track_like (id INT AUTO_INCREMENT NOT NULL, track_id INT NOT NULL, user_id INT DEFAULT 1 NOT NULL, created_at DATETIME DEFAULT \'current_timestamp()\' NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4 COLLATE `utf8mb4_general_ci` ENGINE = InnoDB COMMENT = \'\' ');
        $this->addSql('ALTER TABLE activity CHANGE name name VARCHAR(255) DEFAULT \'NULL\', CHANGE day day VARCHAR(255) DEFAULT \'NULL\', CHANGE time time VARCHAR(255) DEFAULT \'NULL\', CHANGE supervisor supervisor VARCHAR(255) DEFAULT \'NULL\'');
        $this->addSql('ALTER TABLE activity_modules ADD supervisorName VARCHAR(100) DEFAULT \'NULL\', DROP supervisor_name, CHANGE emoji emoji VARCHAR(50) DEFAULT \'NULL\', CHANGE status status VARCHAR(20) DEFAULT \'\'\'ACTIVE\'\'\'');
        $this->addSql('ALTER TABLE chapter DROP FOREIGN KEY FK_F981B52EAA5D4036');
        $this->addSql('DROP INDEX IDX_F981B52EAA5D4036 ON chapter');
        $this->addSql('ALTER TABLE chapter CHANGE title title VARCHAR(255) DEFAULT \'NULL\'');
        $this->addSql('ALTER TABLE comments DROP FOREIGN KEY FK_5F9E962AE85286B2');
        $this->addSql('ALTER TABLE comments DROP FOREIGN KEY FK_5F9E962AC6ACA2AD');
        $this->addSql('ALTER TABLE comments DROP FOREIGN KEY FK_5F9E962A4B89032C');
        $this->addSql('ALTER TABLE comments DROP FOREIGN KEY FK_5F9E962AA76ED395');
        $this->addSql('DROP INDEX IDX_5F9E962AE85286B2 ON comments');
        $this->addSql('DROP INDEX IDX_5F9E962AC6ACA2AD ON comments');
        $this->addSql('DROP INDEX IDX_5F9E962A4B89032C ON comments');
        $this->addSql('DROP INDEX IDX_5F9E962AA76ED395 ON comments');
        $this->addSql('ALTER TABLE comments CHANGE content content TEXT DEFAULT NULL, CHANGE created_at created_at DATETIME DEFAULT \'current_timestamp()\' NOT NULL');
        $this->addSql('ALTER TABLE contribution_version DROP FOREIGN KEY FK_FE3DA302166053B4');
        $this->addSql('DROP INDEX IDX_FE3DA302166053B4 ON contribution_version');
        $this->addSql('ALTER TABLE contribution_version CHANGE author_name author_name VARCHAR(255) DEFAULT \'NULL\', CHANGE content content TEXT DEFAULT NULL, CHANGE version_message version_message TEXT DEFAULT NULL');
        $this->addSql('ALTER TABLE drawing DROP FOREIGN KEY FK_996B9FE7A76ED395');
        $this->addSql('DROP INDEX IDX_996B9FE7A76ED395 ON drawing');
        $this->addSql('ALTER TABLE drawing CHANGE title title VARCHAR(255) DEFAULT \'NULL\', CHANGE description description TEXT DEFAULT NULL, CHANGE created_at created_at DATETIME DEFAULT \'current_timestamp()\' NOT NULL, CHANGE published published TINYINT DEFAULT 0');
        $this->addSql('ALTER TABLE drawing_like DROP FOREIGN KEY FK_6A90CF07E6552D89');
        $this->addSql('ALTER TABLE drawing_like DROP FOREIGN KEY FK_6A90CF07A76ED395');
        $this->addSql('DROP INDEX IDX_6A90CF07E6552D89 ON drawing_like');
        $this->addSql('DROP INDEX IDX_6A90CF07A76ED395 ON drawing_like');
        $this->addSql('ALTER TABLE drawing_tag DROP FOREIGN KEY FK_FCDFB1B9E6552D89');
        $this->addSql('ALTER TABLE drawing_tag DROP FOREIGN KEY FK_FCDFB1B9BAD26311');
        $this->addSql('DROP INDEX IDX_FCDFB1B9E6552D89 ON drawing_tag');
        $this->addSql('DROP INDEX IDX_FCDFB1B9BAD26311 ON drawing_tag');
        $this->addSql('ALTER TABLE drawing_tag CHANGE drawing_id drawing_id INT DEFAULT NULL, CHANGE tag_id tag_id INT DEFAULT NULL, DROP PRIMARY KEY');
        $this->addSql('ALTER TABLE layer DROP FOREIGN KEY FK_E4DB211AE6552D89');
        $this->addSql('DROP INDEX IDX_E4DB211AE6552D89 ON layer');
        $this->addSql('ALTER TABLE layer CHANGE name name VARCHAR(255) DEFAULT \'NULL\', CHANGE visible visible TINYINT DEFAULT 1');
        $this->addSql('ALTER TABLE likes DROP FOREIGN KEY FK_49CA4E7D4B89032C');
        $this->addSql('ALTER TABLE likes DROP FOREIGN KEY FK_49CA4E7DA76ED395');
        $this->addSql('DROP INDEX IDX_49CA4E7D4B89032C ON likes');
        $this->addSql('DROP INDEX IDX_49CA4E7DA76ED395 ON likes');
        $this->addSql('DROP INDEX unique_post_user_like ON likes');
        $this->addSql('ALTER TABLE museum DROP FOREIGN KEY FK_62474477AA5D4036');
        $this->addSql('DROP INDEX IDX_62474477AA5D4036 ON museum');
        $this->addSql('ALTER TABLE museum CHANGE title title VARCHAR(255) DEFAULT \'NULL\', CHANGE author_name author_name VARCHAR(255) DEFAULT \'NULL\', CHANGE description description TEXT DEFAULT NULL, CHANGE genre genre VARCHAR(100) DEFAULT \'NULL\', CHANGE full_content full_content TEXT DEFAULT NULL');
        $this->addSql('ALTER TABLE museum_submissions CHANGE type type VARCHAR(50) DEFAULT \'NULL\', CHANGE status status VARCHAR(50) DEFAULT \'NULL\', CHANGE image_path image_path VARCHAR(255) DEFAULT \'NULL\', CHANGE title title VARCHAR(255) DEFAULT \'NULL\'');
        $this->addSql('ALTER TABLE pixel_art CHANGE name name VARCHAR(255) DEFAULT \'NULL\', CHANGE image_path image_path VARCHAR(255) DEFAULT \'NULL\', CHANGE likes likes INT DEFAULT 0');
        $this->addSql('ALTER TABLE posts DROP FOREIGN KEY FK_885DBAFAF675F31B');
        $this->addSql('ALTER TABLE posts DROP FOREIGN KEY FK_885DBAFA81C06096');
        $this->addSql('DROP INDEX IDX_885DBAFAF675F31B ON posts');
        $this->addSql('DROP INDEX IDX_885DBAFA81C06096 ON posts');
        $this->addSql('ALTER TABLE posts CHANGE description description TEXT DEFAULT NULL, CHANGE image_path image_path VARCHAR(255) DEFAULT \'NULL\', CHANGE magic_sparks magic_sparks INT DEFAULT 0');
        $this->addSql('ALTER TABLE post_tags DROP FOREIGN KEY FK_A6E9F32D4B89032C');
        $this->addSql('DROP INDEX IDX_A6E9F32D4B89032C ON post_tags');
        $this->addSql('ALTER TABLE post_tags CHANGE tag tag VARCHAR(255) DEFAULT \'NULL\'');
        $this->addSql('ALTER TABLE scene DROP FOREIGN KEY FK_D979EFDA579F4768');
        $this->addSql('DROP INDEX IDX_D979EFDA579F4768 ON scene');
        $this->addSql('ALTER TABLE scene CHANGE title title VARCHAR(255) DEFAULT \'NULL\', CHANGE content content TEXT DEFAULT NULL, CHANGE status status VARCHAR(50) DEFAULT \'NULL\'');
        $this->addSql('ALTER TABLE shapes_3d CHANGE shape_type shape_type VARCHAR(255) DEFAULT \'NULL\', CHANGE color color VARCHAR(255) DEFAULT \'NULL\', CHANGE texture texture VARCHAR(255) DEFAULT \'NULL\', CHANGE image_path image_path VARCHAR(255) DEFAULT \'NULL\', CHANGE likes likes INT DEFAULT 0');
        $this->addSql('ALTER TABLE story CHANGE title title VARCHAR(255) DEFAULT \'NULL\', CHANGE genre genre VARCHAR(100) DEFAULT \'NULL\', CHANGE status status VARCHAR(50) DEFAULT \'NULL\', CHANGE cover_image cover_image VARCHAR(255) DEFAULT \'NULL\', CHANGE content content TEXT DEFAULT NULL');
        $this->addSql('ALTER TABLE tag CHANGE name name VARCHAR(255) DEFAULT \'NULL\'');
        $this->addSql('DROP INDEX UNIQ_8D93D649E7927C74 ON user');
        $this->addSql('ALTER TABLE user ADD firstName VARCHAR(255) DEFAULT \'NULL\', ADD lastName VARCHAR(255) DEFAULT \'NULL\', DROP first_name, DROP last_name, CHANGE email email VARCHAR(255) DEFAULT \'NULL\', CHANGE password password VARCHAR(255) DEFAULT \'NULL\', CHANGE role role VARCHAR(50) DEFAULT \'NULL\', CHANGE age age INT DEFAULT 0, CHANGE points points INT DEFAULT 0, CHANGE level level INT DEFAULT 1, CHANGE xp xp INT DEFAULT 0, CHANGE blocked blocked TINYINT DEFAULT 0');
    }
}
