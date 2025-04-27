"""fix goal type default

Revision ID: e5ea00b82916
Revises: add_goal_type
Create Date: 2024-03-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e5ea00b82916'
down_revision = 'add_goal_type'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Update any null goal_type values to 'distance'
    op.execute("""
        UPDATE goal SET goal_type = 'distance'
        WHERE goal_type IS NULL
    """)

    # Use batch operations for SQLite compatibility
    with op.batch_alter_table('goal') as batch_op:
        # Make goal_type not nullable with a default value
        batch_op.alter_column('goal_type',
                            existing_type=sa.String(),
                            nullable=False,
                            server_default='distance')


def downgrade() -> None:
    # Use batch operations for SQLite compatibility
    with op.batch_alter_table('goal') as batch_op:
        # Make goal_type nullable and remove default value
        batch_op.alter_column('goal_type',
                            existing_type=sa.String(),
                            nullable=True,
                            server_default=None) 