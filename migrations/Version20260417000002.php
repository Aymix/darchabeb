<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260417000002 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create acoustic_recordings and acoustic_tracks tables';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE acoustic_recordings (
            id            INT AUTO_INCREMENT NOT NULL,
            user_id       INT NOT NULL,
            instrument    VARCHAR(30)  NOT NULL DEFAULT \'piano\',
            title         VARCHAR(255) DEFAULT NULL,
            data          LONGTEXT     DEFAULT NULL,
            duration_seconds INT       DEFAULT NULL,
            created_at    DATETIME     NOT NULL,
            PRIMARY KEY(id),
            INDEX IDX_AR_USER (user_id),
            CONSTRAINT FK_AR_USER FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');

        $this->addSql('CREATE TABLE acoustic_tracks (
            id               INT AUTO_INCREMENT NOT NULL,
            user_id          INT NOT NULL,
            title            VARCHAR(255)  NOT NULL DEFAULT \'Untitled Track\',
            genre            VARCHAR(100)  DEFAULT NULL,
            bpm              INT           DEFAULT NULL,
            instrument       VARCHAR(30)   NOT NULL DEFAULT \'piano\',
            notes_data       LONGTEXT      DEFAULT NULL,
            is_public        TINYINT(1)    NOT NULL DEFAULT 0,
            likes            INT           NOT NULL DEFAULT 0,
            duration_seconds INT           DEFAULT NULL,
            created_at       DATETIME      NOT NULL,
            PRIMARY KEY(id),
            INDEX IDX_AT_USER (user_id),
            CONSTRAINT FK_AT_USER FOREIGN KEY (user_id) REFERENCES user (id) ON DELETE CASCADE
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE = InnoDB');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE acoustic_tracks');
        $this->addSql('DROP TABLE acoustic_recordings');
    }
}
