import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages

def main():
    # Ask for input type: BV or PV (per unit)
    entry_type = input("Enter 'BV' for Base Value or 'PV' for Product Value (per unit): ").upper()
    
    # Ask for the value (per unit)
    try:
        per_unit_value = float(input(f"Enter the per unit {entry_type}: "))
    except ValueError:
        print("Invalid input. Please enter a number.")
        return
    
    # Ask for GST percentage on item
    try:
        gst_percent = float(input("Enter GST Percentage on the item: "))
    except ValueError:
        print("Invalid input. Please enter a number.")
        return
    
    # Ask for project type
    project_type = input("Is the project State Govt. funded (S) or eCommittee Funded (E)? ").upper()
    if project_type == 'S':
        hartron_percent = 4
    elif project_type == 'E':
        hartron_percent = 2
    else:
        print("Invalid selection. Please enter S or E.")
        return
    
    # Calculations per unit
    if entry_type == 'PV':
        per_unit_pv = per_unit_value
        per_unit_bv = per_unit_pv / (1 + gst_percent / 100)
        per_unit_gst_product = per_unit_pv - per_unit_bv
    elif entry_type == 'BV':
        per_unit_bv = per_unit_value
        per_unit_gst_product = per_unit_bv * (gst_percent / 100)
        per_unit_pv = per_unit_bv + per_unit_gst_product
    else:
        print("Invalid entry type. Please enter BV or PV.")
        return
    
    # Ask for total quantity
    try:
        total_quantity = int(input("Enter total quantity of the item: "))
    except ValueError:
        print("Invalid input. Please enter an integer.")
        return
    
    # State wise bifurcation
    try:
        num_states = int(input("Enter number of states: "))
    except ValueError:
        print("Invalid input. Please enter an integer.")
        return
    
    states = []
    quantities = []
    for i in range(num_states):
        state = input(f"Enter state {i+1} name: ")
        try:
            qty = int(input(f"Enter quantity for {state}: "))
        except ValueError:
            print("Invalid input. Please enter an integer.")
            return
        states.append(state)
        quantities.append(qty)
    
    if sum(quantities) != total_quantity:
        print("Error: State quantities do not sum to total quantity.")
        return
    
    # Calculate per state values
    base_states = [per_unit_bv * qty for qty in quantities]
    gst_product_states = [per_unit_gst_product * qty for qty in quantities]
    total_product_states = [b + g for b, g in zip(base_states, gst_product_states)]
    hartron_states = [bs * (hartron_percent / 100) for bs in base_states]
    gst_hartron_states = [hs * 0.18 for hs in hartron_states]
    total_states = [tp + hs + gs for tp, hs, gs in zip(total_product_states, hartron_states, gst_hartron_states)]
    
    # Deductions per state
    gst_tds_product_states = [bs * 0.02 for bs in base_states]
    gst_tds_hartron_states = [hs * 0.02 for hs in hartron_states]
    tds_hartron_states = [hs * 0.10 for hs in hartron_states]
    
    # Ask for late penalty per unit
    try:
        penalty_per_unit = float(input("Enter late delivery/installation penalty per unit (0 if none): "))
    except ValueError:
        print("Invalid input. Please enter a number.")
        return
    penalty_states = [penalty_per_unit * qty for qty in quantities]
    
    # Ask if amount already lying with HARTRON
    already_states = [0.0] * num_states
    already_lying = input("Is any amount already lying with HARTRON? (Y/N): ").upper()
    if already_lying == 'Y':
        paid_type = input("Paid collectively (C) or per state (P)? ").upper()
        if paid_type == 'C':
            try:
                total_paid = float(input("Enter total amount already paid: "))
            except ValueError:
                print("Invalid input. Please enter a number.")
                return
            for i, qty in enumerate(quantities):
                share = total_paid * (qty / total_quantity) if total_quantity > 0 else 0
                already_states[i] = round(share, 2)
        elif paid_type == 'P':
            for i, state in enumerate(states):
                try:
                    amount = float(input(f"Enter amount paid from {state}: "))
                except ValueError:
                    print("Invalid input. Please enter a number.")
                    return
                already_states[i] = amount
        else:
            print("Invalid selection. Please enter C or P.")
            return
    
    # Total deductions per state
    total_deductions_states = [
        gtp + gth + th + pen + al
        for gtp, gth, th, pen, al in zip(gst_tds_product_states, gst_tds_hartron_states, tds_hartron_states, penalty_states, already_states)
    ]
    
    # Payment per state
    payment_states = [ts - tds for ts, tds in zip(total_states, total_deductions_states)]
    
    # Withdrawn per state
    withdrawn_states = [
        gtp + gth + th + pay
        for gtp, gth, th, pay in zip(gst_tds_product_states, gst_tds_hartron_states, tds_hartron_states, payment_states)
    ]
    
    # Now build the table
    descriptions = [
        (1, "Total qty supplied"),
        (2, f"Base value of product (per unit {round(per_unit_bv, 2)} * #1)"),
        (3, f"{gst_percent}% GST on base value of product (# 2)"),
        (4, "Total product cost inclusive of GST(# 2+3)"),
        (5, f"Hartron consultancy Charges @{hartron_percent}% on the base value of product at #2"),
        (6, "GST on Hartron Consultancy Charges @ 18% on # 5"),
        (7, "Total (# 4+5+6)"),
        (8, "Deductions"),
        (9, "2% GST TDS required to be deducted on base value of product #2"),
        (10, "2% GST TDS required to be deducted on Hartron Consultancy Charges #5"),
        (11, "10% TDS required to be deducted on base value of Hartron consultancy charges #5"),
        (12, "Statewise Late delivery/installation penalty"),
        (13, "Amount already available with HARTRON"),
        (14, "Total deductions (#9+10+11+12+13)"),
        (15, "Payment to be made to HARTRON (#7-14)"),
        (16, "Statewise Amount to be withdrawn")
    ]
    
    # Data lists
    data = []
    state_columns = {state: [] for state in states}
    total_column = []
    
    values_lists = [
        quantities,
        base_states,
        gst_product_states,
        total_product_states,
        hartron_states,
        gst_hartron_states,
        total_states,
        [None] * num_states,  # Deductions title, no values
        gst_tds_product_states,
        gst_tds_hartron_states,
        tds_hartron_states,
        penalty_states,
        already_states,
        total_deductions_states,
        payment_states,
        withdrawn_states
    ]
    
    for i, (sr, desc) in enumerate(descriptions):
        row = [sr, desc]
        state_values = values_lists[i] if values_lists[i][0] is not None else [''] * num_states
        for val in state_values:
            row.append(round(val, 2) if isinstance(val, float) else val)
        total = sum(state_values) if all(isinstance(v, (int, float)) for v in state_values) else ''
        row.append(round(total, 2) if isinstance(total, float) else total)
        data.append(row)
    
    # Columns
    columns = ['Sr.', 'Description'] + states + ['Total']
    
    # Create DataFrame
    df = pd.DataFrame(data, columns=columns)
    
    # Display the table
    print("\nBill Table:")
    print(df.to_string(index=False))
    
    # Option to export
    export_option = input("\nExport to Excel (E), PDF (P), or none (N)? ").upper()
    if export_option == 'E':
        df.to_excel('bill.xlsx', index=False)
        print("Exported to bill.xlsx")
    elif export_option == 'P':
        fig, ax = plt.subplots(figsize=(12 + len(states)*2, len(data) * 0.3))
        ax.axis('tight')
        ax.axis('off')
        table = ax.table(cellText=df.values, colLabels=df.columns, loc='center', cellLoc='center')
        table.auto_set_font_size(False)
        table.set_fontsize(8)
        table.auto_set_column_width(col=list(range(len(df.columns))))
        with PdfPages('bill.pdf') as pp:
            pp.savefig(fig, bbox_inches='tight')
        plt.close()
        print("Exported to bill.pdf")

if __name__ == "__main__":
    main()