import sys
import os

# Add current directory to sys.path
sys.path.append(os.getcwd())

try:
    from tests import test_main
    print("Imported test_main successfully")
    
    print("Running test_upload_document...")
    test_main.test_upload_document()
    print("test_upload_document passed")

    print("Running test_search_documents...")
    test_main.test_search_documents()
    print("test_search_documents passed")
    
    print("All tests passed!")
except Exception as e:
    print(f"Test failed: {e}")
    import traceback
    traceback.print_exc()
