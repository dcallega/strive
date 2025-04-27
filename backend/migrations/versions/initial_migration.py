"""initial migration

Revision ID: initial_migration
Revises: 
Create Date: 2024-03-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'initial_migration'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Drop existing tables if they exist
    op.execute('DROP TABLE IF EXISTS goal')
    op.execute('DROP TABLE IF EXISTS users')

    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('strava_id', sa.Integer(), nullable=False),
        sa.Column('access_token', sa.String(), nullable=False),
        sa.Column('refresh_token', sa.String(), nullable=False),
        sa.Column('token_expires_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('strava_id')
    )

    # Create goals table
    op.create_table(
        'goal',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('week', sa.Integer(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('target', sa.Float(), nullable=False),
        sa.Column('unit', sa.String(), nullable=False),
        sa.Column('goal_type', sa.String(), nullable=False, server_default='distance'),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='fk_goal_user_id'),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade() -> None:
    op.drop_table('goal')
    op.drop_table('users') 