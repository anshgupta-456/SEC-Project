"""add remarks column to grievance (admin response to the student)

Revision ID: b7c1d2e3f4a5
Revises: ef3d0a55f5bc
Create Date: 2026-11-25 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b7c1d2e3f4a5'
down_revision = 'ef3d0a55f5bc'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('grievance', schema=None) as batch_op:
        batch_op.add_column(sa.Column('remarks', sa.Text(), nullable=True))


def downgrade():
    with op.batch_alter_table('grievance', schema=None) as batch_op:
        batch_op.drop_column('remarks')
