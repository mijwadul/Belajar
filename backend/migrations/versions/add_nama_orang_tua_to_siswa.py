
"""
Add nama_orang_tua column to siswa table
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_nama_orang_tua_to_siswa'
down_revision = 'd1b7754ecd7c' 
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('siswa', sa.Column('nama_orang_tua', sa.String(length=150), nullable=True))

def downgrade():
    op.drop_column('siswa', 'nama_orang_tua')
