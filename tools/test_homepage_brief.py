import unittest

from homepage_brief import END, START, update_homepage


class HomepageBriefTest(unittest.TestCase):
    def setUp(self):
        self.template = f'before{START}previous issue{END}after'
        self.issue = {
            'edition': '2026-11-09', 'region': 'Malaysia', 'headline': 'Fields A & B',
            'news': 'Partners sign an agreement.', 'engineering': 'How will the streams be measured?',
            'sources': [{'label': 'Operator release', 'url': 'https://example.com/release'}],
            'field': {'reference': 'A1', 'teaser': 'Featured field note'},
            'research': {'reference': 'P1', 'headline': 'Research question?', 'teaser': 'Featured paper'}
        }
        self.article = {'kind': 'articles', 'reference': 'A1', 'title': 'Lessons from a tank',
                        'summary': 'Article summary', 'byline': 'A. Author'}
        self.paper = {'kind': 'publications', 'reference': 'P1', 'title': 'Field trials',
                      'summary': 'Paper summary', 'byline': 'B. Author'}
        self.paths = {'A1': '/articles/one.html', 'P1': '/papers/one.html'}

    def test_build_preserves_the_rest_of_the_homepage(self):
        entries = {'A1': self.article, 'P1': self.paper}
        html = update_homepage(self.template, self.issue, entries, self.paths)
        self.assertTrue(html.startswith('before' + START))
        self.assertTrue(html.endswith(END + 'after'))
        for expected in ['Fields A &amp; B', '9 November 2026', 'Operator release', 'Featured field note',
                         'Research question?', 'A. Author', 'B. Author', *self.paths.values()]:
            self.assertIn(expected, html)
        self.assertEqual(html, update_homepage(html, self.issue, entries, self.paths))
        self.assertNotIn('previous issue', html)

    def test_withdrawn_selection_and_empty_categories(self):
        alternate = dict(self.article, reference='A2', title='New field note')
        html = update_homepage(self.template, self.issue, {'A2': alternate}, {'A2': '/articles/two.html'})
        self.assertIn('New field note', html)
        self.assertIn('/articles/two.html', html)
        for stale in ['Featured field note', '/articles/one.html', 'Research into practice']:
            self.assertNotIn(stale, html)

    def test_invalid_source_is_rejected_before_a_homepage_is_written(self):
        self.issue['sources'][0]['url'] = 'javascript:example'
        with self.assertRaises(ValueError):
            update_homepage(self.template, self.issue, {}, {})


if __name__ == '__main__':
    unittest.main()
