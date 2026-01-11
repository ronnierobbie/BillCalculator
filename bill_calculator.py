# ============================================================
# HARTRON BILL CALCULATOR
# ============================================================

import streamlit as st
import pandas as pd
from io import BytesIO
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

# ============================================================
# CONFIG
# ============================================================

st.set_page_config(page_title="HARTRON Bill Calculator", layout="wide")
st.title("HARTRON Bill Calculator")

GSTPH = 18
GST_TDS_PRODUCT = 2
GST_TDS_HCC = 2
TDS_HCC = 10

STATES = ["Punjab", "Haryana", "UT Chandigarh"]

# ============================================================
# INPUTS
# ============================================================

st.header("A. Core Inputs")

funding = st.radio("Funding Type", ["State Govt Funded (SGF)", "eCommittee Funded (eCF)"])
HCC_RATE = 0.04 if "SGF" in funding else 0.02

gstp = st.number_input("GST % on Product", value=18.0)

value_type = st.radio("Input Type", ["Base Value (BV)", "Product Value (PV – GST Inclusive)"])
value = st.number_input("Enter Value", min_value=0.0)

st.header("B. Quantity Distribution")

total_qty = st.number_input("Total Quantity", min_value=1, step=1)

qty = {}
cols = st.columns(3)
for i, s in enumerate(STATES):
    qty[s] = cols[i].number_input(f"{s} Quantity", min_value=0, step=1)

if sum(qty.values()) != total_qty:
    st.error("Quantity breakup must equal total quantity.")
    st.stop()

st.header("C. Statewise Late Delivery / Installation Penalty")

penalty = {}
cols = st.columns(3)
for i, s in enumerate(STATES):
    penalty[s] = cols[i].number_input(f"{s} Penalty Amount", min_value=0.0)

st.header("D. Amount already available with HARTRON")

mode = st.radio(
    "Advance received mode",
    ["Single consolidated amount", "State-wise individual amounts"]
)

advance_state = {}

if mode == "Single consolidated amount":
    adv_total = st.number_input("Total Amount already available with HARTRON", min_value=0.0)
    for s in STATES:
        advance_state[s] = adv_total * qty[s] / total_qty
else:
    cols = st.columns(3)
    for i, s in enumerate(STATES):
        advance_state[s] = cols[i].number_input(f"{s} Advance Amount", min_value=0.0)

# ============================================================
# CALCULATIONS
# ============================================================

if value <= 0:
    st.warning("Enter a valid BV or PV to proceed.")
    st.stop()

# --- Product calculations ---
if value_type.startswith("Product"):
    PV = value
    GST_product = PV * gstp / (100 + gstp)
    BV = PV - GST_product
else:
    BV = value
    GST_product = BV * gstp / 100
    PV = BV + GST_product

HCC = BV * HCC_RATE
GST_HCC = HCC * GSTPH / 100

# --- Totals before deductions ---
INTERMEDIATE_TOTAL = BV + GST_product + HCC + GST_HCC

# --- Statutory deductions ---
GST_TDS_PRODUCT_AMT = BV * GST_TDS_PRODUCT / 100
GST_TDS_HCC_AMT = HCC * GST_TDS_HCC / 100
TDS_HCC_AMT = HCC * TDS_HCC / 100

# ============================================================
# EVEN ADJUSTMENT LOGIC
# ============================================================

def make_even(total):
    return total if int(round(total)) % 2 == 0 else total + 1

GST_TOTAL = GST_product + GST_HCC
GST_TDS_TOTAL = GST_TDS_PRODUCT_AMT + GST_TDS_HCC_AMT

GST_TOTAL_EVEN = make_even(GST_TOTAL)
GST_TDS_TOTAL_EVEN = make_even(GST_TDS_TOTAL)

GST_ADJUSTMENT = GST_TOTAL_EVEN - GST_TOTAL
GST_TDS_ADJUSTMENT = GST_TDS_TOTAL_EVEN - GST_TDS_TOTAL

ADJUSTMENT_NOTE = ""
if GST_ADJUSTMENT or GST_TDS_ADJUSTMENT:
    ADJUSTMENT_NOTE = "₹1 adjustment applied to ensure EVEN GST / GST TDS total."

# ============================================================
# FINAL PAYABLE
# ============================================================

TOTAL_PENALTY = sum(penalty.values())
TOTAL_ADVANCE = sum(advance_state.values())

NET_PAYABLE = (
    INTERMEDIATE_TOTAL
    - GST_TDS_PRODUCT_AMT
    - GST_TDS_HCC_AMT
    - TDS_HCC_AMT
    - TOTAL_PENALTY
    - TOTAL_ADVANCE
    + GST_ADJUSTMENT
    + GST_TDS_ADJUSTMENT
)

# ============================================================
# OUTPUT TABLE (EXCEL STRUCTURE)
# ============================================================

rows = [
    [1, "Base Value of Product", BV],
    [2, f"GST @ {gstp}%", GST_product],
    [3, "Product Value", PV],
    [4, f"HARTRON Consultancy Charges @{int(HCC_RATE*100)}%", HCC],
    [5, "GST on HARTRON Consultancy Charges @18%", GST_HCC],
    [6, "Total (A)", INTERMEDIATE_TOTAL],
    [7, "GST TDS @2% on Base Value of Product", -GST_TDS_PRODUCT_AMT],
    [8, "GST TDS @2% on HARTRON Consultancy Charges", -GST_TDS_HCC_AMT],
    [9, "TDS @10% on HARTRON Consultancy Charges", -TDS_HCC_AMT],
    [10, "Statewise Late Delivery / Installation Penalty", -TOTAL_PENALTY],
    [11, "Amount already available with HARTRON", -TOTAL_ADVANCE],
    [12, "Net Payable Amount", NET_PAYABLE],
]

df = pd.DataFrame(rows, columns=["Sr#", "Description", "Amount"])

st.header("E. Bill Summary")
st.dataframe(df, use_container_width=True)

if ADJUSTMENT_NOTE:
    st.info(ADJUSTMENT_NOTE)

# ============================================================
# EXPORTS
# ============================================================

def export_excel(df):
    buf = BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Bill")
    return buf.getvalue()

def export_pdf(df):
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4)
    styles = getSampleStyleSheet()

    data = [["Sr#", "Description", "Amount"]] + df.values.tolist()

    table = Table(data, colWidths=[40, 330, 100])
    table.setStyle(TableStyle([
        ("GRID", (0,0), (-1,-1), 0.5, colors.black),
        ("BACKGROUND", (0,0), (-1,0), colors.lightgrey),
        ("ALIGN", (2,1), (2,-1), "RIGHT"),
        ("FONT", (0,0), (-1,0), "Helvetica-Bold")
    ]))

    doc.build([Paragraph("HARTRON Bill Summary", styles["Title"]), table])
    buf.seek(0)
    return buf

st.download_button(
    "Download Excel",
    export_excel(df),
    file_name="HARTRON_Bill.xlsx"
)

st.download_button(
    "Download PDF",
    export_pdf(df),
    file_name="HARTRON_Bill.pdf"
)
