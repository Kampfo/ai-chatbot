import sys
import os

# Add current directory to sys.path
sys.path.append(os.getcwd())

try:
    from tests import test_main
    print("Imported test_main successfully")
    
    print("Running test_create_audit...")
    test_main.test_create_audit()
    print("test_create_audit passed")

    print("Running test_read_audits...")
    test_main.test_read_audits()
    print("test_read_audits passed")

    print("Running test_create_risk...")
    test_main.test_create_risk()
    print("test_create_risk passed")
    
    print("All tests passed!")
except Exception as e:
    print(f"Test failed: {e}")
    import traceback
    traceback.print_exc()
