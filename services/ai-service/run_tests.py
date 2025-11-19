import sys
import os
import asyncio

# Add current directory to sys.path
sys.path.append(os.getcwd())

try:
    from tests import test_main
    print("Imported test_main successfully")
    
    print("Running test_chat_endpoint...")
    test_main.test_chat_endpoint()
    print("test_chat_endpoint passed")
    
    print("All tests passed!")
except Exception as e:
    print(f"Test failed: {e}")
    import traceback
    traceback.print_exc()
