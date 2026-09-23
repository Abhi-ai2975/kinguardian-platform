from abc import abstractmethod

class BaseConnector:
    @abstractmethod
    def connect(self):
        """
        Abstract method that must be implemented by all subclasses.
        """
        raise NotImplementedError("Subclasses must implement this method")