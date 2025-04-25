from sqlalchemy import MetaData, Table, Column, Integer, String, Float, Date
metadata = MetaData()

sales = Table(
    "sales", metadata,
    Column("invoice_id", String, primary_key=True),
    Column("product", String),
    Column("total", Float),
    Column("date", Date)
)
