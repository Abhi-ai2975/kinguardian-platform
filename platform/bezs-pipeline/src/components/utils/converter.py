import pandas as pd

class ExcelToCsvUtil:
    """
    A reusable utility to convert XLSX files to CSV format.
    Optimized for large files using the openpyxl engine.
    """
    def __init__(self, engine: str = 'openpyxl'):
        self.engine = engine

    def convert(self, input_path: str, output_path: str) -> None:
        print(f"Processing: {input_path}")
        
        # Using a context manager ensures the file handle is closed properly
        with pd.ExcelFile(input_path, engine=self.engine) as xls:
            # By not specifying sheet_name, Pandas defaults to the first sheet
            df = pd.read_excel(xls)
            
            # Writing to CSV for lighter downstream processing
            df.to_csv(output_path, index=False)
            
        print(f"Successfully saved to: {output_path}")