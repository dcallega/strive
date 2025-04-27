"""add goal type

Revision ID: add_goal_type
Revises: initial_migration
Create Date: 2024-03-26 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel
from alembic.context import get_context

# revision identifiers, used by Alembic.
revision = 'add_goal_type'
down_revision = 'initial_migration'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Update goal_type based on the unit first
    op.execute("""
        UPDATE goal SET goal_type = 
        CASE 
            WHEN unit IN ('km', 'mi') THEN 'distance'
            WHEN unit IN ('hours', 'minutes') THEN 'time'
            WHEN unit = 'sessions' THEN 'sessions'
            ELSE 'distance'  -- Default to 'distance' if unit is null or empty
        END
    """)

    # Use batch operations for SQLite compatibility
    with op.batch_alter_table('goal') as batch_op:
        # Add user_id column with foreign key constraint
        batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_goal_user_id', 'users', ['user_id'], ['id'])
        
        # Make goal_type not nullable after setting values
        batch_op.alter_column('goal_type',
                            existing_type=sa.String(),
                            nullable=False)

def downgrade() -> None:
    # Use batch operations for SQLite compatibility
    with op.batch_alter_table('goal') as batch_op:
        # Drop the foreign key constraint and user_id column
        batch_op.drop_constraint('fk_goal_user_id', type_='foreignkey')
        batch_op.drop_column('user_id')
        
        # Make goal_type nullable and then drop it
        batch_op.alter_column('goal_type',
                            existing_type=sa.String(),
                            nullable=True)
        batch_op.drop_column('goal_type') 