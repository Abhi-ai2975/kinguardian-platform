1. builtins.open
----------------

**builtins** is the Python module containing all standard functions like print() and open(). We patch it to intercept the   file opening process. Instead of reading a real file on your hard drive, it simulates a failure or returns mock data.

2. Pytest and Asyncio
---------------------
 
**@pytest.mark.asyncio** This tells pytest that the function is a coroutine (uses await). Without it, pytest would try to run the test like a normal function and fail.

**asyncio** This is the Python library that allows your code to do multi-tasking. It lets the PDFTransformer start parsing Paper B while Paper A is still loading, instead of waiting in a single line.

3. Coroutine
------------

A **coroutine** is a special function defined with async def.

    Regular Function: Runs from start to finish immediately.

    Coroutine: Can pause (using await) to let other tasks run, then resume later.