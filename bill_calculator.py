import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from io import BytesIO

def main():
    st.title("HARTRON Bill Calculator")

    # Hardcode states to match the sheet
    states = ['Punjab', 'Haryana', 'Chandigarh']

    # Input type: BV or PV
    entry_type = st.selectbox("Select input type:", ["Base Value (BV)", "Product Value (PV)"])
    entry_type_short = 'BV' if 'Base' in entry_type else 'PV'

    # Value per unit
    value = st.number_input(f"Enter the {entry_type} per unit:", min_value=0.0, value=0.0)

    # GST percentage on item
    gst_percent = st.number_input("Enter GST Percentage on the item:", min_value=0.0, value=18.0)

    # Project type
    project_type = st.selectbox("Project Funding:", ["State Govt. funded", "eCommittee Funded"])
    hartron_percent = 4 if "State" in project_type else 2

    # Calculations per unit
    if entry_type_short == 'PV':
        pv_unit = value
        gst_product_unit = pv_unit * (gst_percent / (100 + gst_percent))
        bv_unit = pv_unit - gst_product_unit
    else:
        bv_unit = value
        gst_product_unit = bv_unit * (gst_percent / 100)
        pv_unit = bv_unit + gst_product_unit

    # HARTRON Consultancy charges per unit
    hartron_unit = bv_unit * (hartron_percent / 100)
    gst_hartron_unit = hartron_unit * 0.18

    # Quantities per state
    quantities = []
    total_quantity = 0
    for state in states:
        qty = st.number_input(f"Quantity for {state}:", min_value=0, value=0, step=1)
        quantities.append(qty)
        total_quantity += qty

    if total_quantity == 0:
        st.warning("Total quantity cannot be zero.")
        return

    # Late penalties per state
    penalties = []
    for state in states:
        pen = st.number_input(f"Late delivery/installation penalty for {state} (0 if none):", min_value=0.0, value=0.0)
        penalties.append(pen)

    # Amount already lying with HARTRON
    already_lying = st.radio("Is any amount already lying with HARTRON?", ("No", "Yes"))
    already_paid = [0.0] * len(states)
    already_desc = "Amount already available with HARTRON"
    if already_lying == "Yes":
        paid_type = st.radio("Paid collectively or per state?", ("Collectively", "Per State"))
        if paid_type == "Collectively":
            total_paid = st.number_input("Enter total amount already paid:", min_value=0.0, value=0.0)
            for i, qty in enumerate(quantities):
                if total_quantity > 0:
                    share = total_paid * (qty / total_quantity)
                    already_paid[i] = round(share, 2)
        else:
            for i, state in enumerate(states):
                amount = st.number_input(f"Amount paid from {state}:", min_value=0.0, value=0.0)
                already_paid[i] = amount

        # Create description with bifurcation if any paid
        if sum(already_paid) > 0:
            bifurcation = ", ".join([f"{state}: {amount:.2f}" for state, amount in zip(states, already_paid) if amount > 0])
            already_desc = f"Amount already available with HARTRON ({bifurcation})"

    if st.button("Calculate Bill"):
        # Calculate state-wise values
        base_values = [q * bv_unit for q in quantities]
        gst_products = [bv * (gst_percent / 100) for bv in base_values]
        product_totals = [bv + gst for bv, gst in zip(base_values, gst_products)]
        hartrons = [bv * (hartron_percent / 100) for bv in base_values]
        gst_hartrons = [h * 0.18 for h in hartrons]
        totals = [pt + h + gh for pt, h, gh in zip(product_totals, hartrons, gst_hartrons)]

        gst_tds_products = [bv * 0.02 for bv in base_values]
        gst_tds_hartrons = [h * 0.02 for h in hartrons]
        tds_hartrons = [h * 0.10 for h in hartrons]

        deductions = [gtp + gth + th + pen + ap for gtp, gth, th, pen, ap in zip(gst_tds_products, gst_tds_hartrons, tds_hartrons, penalties, already_paid)]
        payments = [t - d for t, d in zip(totals, deductions)]
        withdraws = [p + gtp + gth + th for p, gtp, gth, th in zip(payments, gst_tds_products, gst_tds_hartrons, tds_hartrons)]  # Adjusted to match row 16 logic

        # Totals
        total_col = [
            sum(quantities),
            sum(base_values),
            sum(gst_products),
            sum(product_totals),
            sum(hartrons),
            sum(gst_hartrons),
            sum(totals),
            '',
            sum(gst_tds_products),
            sum(gst_tds_hartrons),
            sum(tds_hartrons),
            sum(penalties),
            sum(already_paid),
            sum(deductions),
            sum(payments),
            sum(withdraws)
        ]

        # Build data
        data = [
            [1, "Total qty supplied"] + quantities + [total_col[0]],
            [2, f"Base value of product (i.e. {bv_unit:.2f} per unit * #1)"] + [round(v, 2) for v in base_values] + [round(total_col[1], 2)],
            [3, f"{gst_percent}% GST on base value of product (# 2)"] + [round(v, 2) for v in gst_products] + [round(total_col[2], 2)],
            [4, "Total product cost inclusive of GST(# 2+3)"] + [round(v, 2) for v in product_totals] + [round(total_col[3], 2)],
            [5, f"Hartron consultancy Charges @{hartron_percent}% on the base value of product at #2"] + [round(v, 2) for v in hartrons] + [round(total_col[4], 2)],
            [6, "GST on Hartron Consultancy Charges @ 18% on # 5"] + [round(v, 2) for v in gst_hartrons] + [round(total_col[5], 2)],
            [7, "Total (# 4+5+6)"] + [round(v, 2) for v in totals] + [round(total_col[6], 2)],
            [8, "Deductions"] + [''] * len(states) + [total_col[7]],
            [9, "2% GST TDS required to be deducted on base value of product #2"] + [round(v, 2) for v in gst_tds_products] + [round(total_col[8], 2)],
            [10, "2% GST TDS required to be deducted on Hartron Consultancy Charges #5"] + [round(v, 2) for v in gst_tds_hartrons] + [round(total_col[9], 2)],
            [11, "10% TDS required to be deducted on base value of Hartron consultancy charges #5"] + [round(v, 2) for v in tds_hartrons] + [round(total_col[10], 2)],
            [12, "Statewise Late delivery/installation penalty"] + [round(v, 2) for v in penalties] + [round(total_col[11], 2)],
            [13, already_desc] + [round(v, 2) for v in already_paid] + [round(total_col[12], 2)],
            [14, "Total deductions (#9+10+11+12+13)"] + [round(v, 2) for v in deductions] + [round(total_col[13], 2)],
            [15, "Payment to be made to HARTRON (#7-14)"] + [round(v, 2) for v in payments] + [round(total_col[14], 2)],
            [16, "Statewise Amount to be withdrawn"] + [round(v, 2) for v in withdraws] + [round(total_col[15], 2)]
        ]

        # Create DataFrame
        columns = ['Sr.', 'Item Description', '(A) Punjab', '(B) Haryana', '(C) Chandigarh', 'D = A+B + C']
        df = pd.DataFrame(data, columns=columns)

        # Display the table
        st.subheader("Bill Table")
        st.dataframe(df)

        # Export to Excel
        excel_buffer = BytesIO()
        df.to_excel(excel_buffer, index=False)
        excel_buffer.seek(0)
        st.download_button(
            label="Download Excel",
            data=excel_buffer,
            file_name="bill.xlsx",
            mime="application/vnd.ms-excel"
        )

        # Export to PDF
        pdf_buffer = BytesIO()
        fig, ax = plt.subplots(figsize=(12, len(data) * 0.3))
        ax.axis('tight')
        ax.axis('off')
        table = ax.table(cellText=df.values, colLabels=df.columns, loc='center', cellLoc='center')
        table.auto_set_font_size(False)
        table.set_fontsize(8)
        table.auto_set_column_width(col=list(range(len(df.columns))))
        with PdfPages(pdf_buffer) as pp:
            pp.savefig(fig, bbox_inches='tight')
        pdf_buffer.seek(0)
        st.download_button(
            label="Download PDF",
            data=pdf_buffer,
            file_name="bill.pdf",
            mime="application/pdf"
        )

if __name__ == "__main__":
    main()
