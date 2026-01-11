import streamlit as st
import pandas as pd
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

# -------------------------------------------------
# PAGE CONFIG
# -------------------------------------------------
st.set_page_config(page_title="HARTRON Bill Calculator", layout="wide")
st.title("📊 HARTRON Bill Calculator")

# -------------------------------------------------
# CONSTANTS (STATUTORY)
# -------------------------------------------------
GSTPH = 18                  # GST on HARTRON Consultancy Charges
GST_TDS_PRODUCT_RATE = 2    # GST TDS on Base Value of Product
GST_TDS_HCC_RATE = 2        # GST TDS on HCC
TDS_HCC_RATE = 10           # TDS on Base Value of HCC

# -------------------------------------------------
# USER INPUT SECTION
# -------------------------------------------------
st.header("1️⃣ Project Details")

funding_type = st.radio(
    "Select Project Funding Type",
    ("State Govt Funded (SGF)", "eCommittee Funded (eCF)")
)

HCC_RATE = 0.04 if "SGF" in funding_type else 0.02

gstp = st.number_input(
    "GST Percentage on Product",
    min_value=0.0,
    value=18.0
)

input_type = st.radio(
    "Select Input Type",
    ("Base Value (BV)", "Product Value – GST Inclusive (PV)")
)

value = st.number_input(
    f"Enter {input_type}",
    min_value=0.0
)

# -------------------------------------------------
# QUANTITY DETAILS
# -------------------------------------------------
st.header("2️⃣ Quantity Details")

qty = st.number_input("Total Quantity", min_value=1, step=1)

col1, col2, col3 = st.columns(3)
punjab = col1.number_input("Punjab Quantity", min_value=0, step=1)
haryana = col2.number_input("Haryana Quantity", min_value=0, step=1)
chd = col3.number_input("UT Chandigarh Quantity", min_value=0, step=1)

if punjab + haryana + chd != qty:
    st.warning("⚠ Quantity bifurcation does not match total quantity.")

# -------------------------------------------------
# CALCULATION ENGINE
# -------------------------------------------------
if value > 0:

    # ---- Product GST Logic ----
    if input_type == "Product Value – GST Inclusive (PV)":
        PV = value
        GSTAP = (PV * gstp) / (100 + gstp)
        BV = PV - GSTAP
    else:
        BV = value
        GSTAP = (BV * gstp) / 100
        PV = BV + GSTAP

    # ---- HARTRON Consultancy Charges ----
    HCC = BV * HCC_RATE
    GSTAH = (HCC * GSTPH) / 100

    # ---- Totals ----
    TT = GSTAP + GSTAH
    TCP = BV + HCC + GSTAP + GSTAH

    # -------------------------------------------------
    # DEDUCTIONS (CORRECTED & FINAL)
    # -------------------------------------------------
    GST_TDS_PRODUCT_AMT = BV * GST_TDS_PRODUCT_RATE / 100
    GST_TDS_HCC_AMT = HCC * GST_TDS_HCC_RATE / 100
    TDS_HCC_AMT = HCC * TDS_HCC_RATE / 100

    TOTAL_DEDUCTIONS = (
        GST_TDS_PRODUCT_AMT +
        GST_TDS_HCC_AMT +
        TDS_HCC_AMT
    )

    NET_PAYABLE = TCP - TOTAL_DEDUCTIONS

    # -------------------------------------------------
    # OUTPUT TABLE
    # -------------------------------------------------
    hcc_text = f"HARTRON Consultancy Charges @{int(HCC_RATE*100)}% on Base Value of Product"
    gst_hcc_text = "GST on HARTRON Consultancy Charges @18%"

    table = [
        ["1", "Base Value of Product", round(BV, 2)],
        ["2", f"GST @ {gstp}%", round(GSTAP, 2)],
        ["3", "Product Value", round(PV, 2)],
        ["4", hcc_text, round(HCC, 2)],
        ["5", gst_hcc_text, round(GSTAH, 2)],
        ["6", "Total Tax (GST)", round(TT, 2)],
        ["7", "Total Cost Price (TCP)", round(TCP, 2)],
        ["8", "GST TDS @2% on Base Value of Product", -round(GST_TDS_PRODUCT_AMT, 2)],
        ["9", "GST TDS @2% on HARTRON Consultancy Charges", -round(GST_TDS_HCC_AMT, 2)],
        ["10", "TDS @10% on Base Value of HARTRON Consultancy Charges", -round(TDS_HCC_AMT, 2)],
        ["11", "Net Payable Amount", round(NET_PAYABLE, 2)]
    ]

    df = pd.DataFrame(table, columns=["Sr.No.", "Description", "Amount"])

    st.header("📋 Bill Calculation")
    st.dataframe(df, use_container_width=True)

    # -------------------------------------------------
    # EXCEL EXPORT
    # -------------------------------------------------
    def to_excel(dataframe):
        buffer = BytesIO()
        with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
            dataframe.to_excel(writer, index=False, sheet_name="Bill")
        return buffer.getvalue()

    excel_data = to_excel(df)

    st.download_button(
        label="⬇ Download Excel",
        data=excel_data,
        file_name="Bill_Calculation.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

    # -------------------------------------------------
    # PDF EXPORT
    # -------------------------------------------------
    def to_pdf(dataframe):
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        y = height - 50

        c.setFont("Helvetica", 10)

        for _, row in dataframe.iterrows():
            line = f"{row['Sr.No']}. {row['Description']} : {row['Amount']}"
            c.drawString(40, y, line)
            y -= 18
            if y < 40:
                c.showPage()
                y = height - 50

        c.save()
        buffer.seek(0)
        return buffer

    pdf_data = to_pdf(df)

    st.download_button(
        label="⬇ Download PDF",
        data=pdf_data,
        file_name="Bill_Calculation.pdf",
        mime="application/pdf"
    )
