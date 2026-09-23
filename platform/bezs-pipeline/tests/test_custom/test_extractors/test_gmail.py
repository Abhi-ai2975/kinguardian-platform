import unittest
from unittest.mock import MagicMock, patch
from src.custom.extractors.gmail import GmailExtractor

class TestGmailExtractor(unittest.TestCase):

    def setUp(self):
        """Prepare the mock service and sample config."""
        # 1. Mock the entire Gmail Service
        self.mock_service = MagicMock()
        
        # 2. Setup the profile mock (for the __init__ call)
        self.mock_service.users().getProfile().execute.return_value = {
            'emailAddress': 'test@example.com'
        }

        self.config = {
            "query": "is:unread",
            "batch_size": 1,
            "extraction_mode": "full",
            "fields": ["from", "subject", "date"]
        }

    def test_extract_success(self):
        """Test fetching and normalizing a single email."""
        # 1. Mock the message list (what messages exist?)
        self.mock_service.users().messages().list().execute.return_value = {
            'messages': [{'id': 'msg123'}]
        }

        # 2. Mock the message content (what is inside the email?)
        sample_email = {
            'id': 'msg123',
            'payload': {
                'headers': [
                    {'name': 'From', 'value': 'boss@work.com'},
                    {'name': 'Subject', 'value': 'Hello'}
                ],
                'body': {'data': 'SGVsbG8gV29ybGQ='} # 'Hello World' in base64
            }
        }
        self.mock_service.users().messages().get().execute.return_value = sample_email

        # 3. Run the extractor
        extractor = GmailExtractor(self.mock_service, self.config)
        # Convert generator to list to run all steps
        results = list(extractor.extract())

        # 4. Assertions
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], 'msg123')
        self.assertEqual(results[0]['metadata']['from'], 'boss@work.com')
        self.assertEqual(results[0]['body'], 'Hello World')
        
        print("\nTest Passed: Gmail email extracted and decoded correctly!")

    @patch("src.custom.extractors.gmail.Path.mkdir") # Don't actually create folders
    @patch("src.custom.extractors.gmail.open", create=True) # Don't actually write files
    def test_handle_attachments(self, mock_open, mock_mkdir):
        """Test that attachments are identified and 'downloaded'."""
        payload = {
            'parts': [{
                'filename': 'resume.pdf',
                'body': {'attachmentId': 'attach789'}
            }]
        }
        # Mock the attachment binary data response
        self.mock_service.users().messages().attachments().get().execute.return_value = {
            'data': 'S09GRUU=' # 'KOFEE' in base64
        }

        extractor = GmailExtractor(self.mock_service, self.config)
        paths = extractor._handle_attachments("msg123", payload)

        self.assertEqual(len(paths), 1)
        self.assertIn("resume.pdf", paths[0])
        print("Test Passed: Attachment handling logic verified!")

if __name__ == "__main__":
    unittest.main()