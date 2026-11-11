import unittest

from homepage_brief import END, START, update_homepage, apply_manual_picks


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

    def test_lead_photo_follows_news_without_image_input(self):
        self.issue['news'] = 'Partners plan an offshore gas development.'
        html = update_homepage(self.template, self.issue, {}, {})
        self.assertIn('/featured-images/offshore.jpg', html)
        self.assertIn('Shenzi platform, Gulf of Mexico, by BSEE', html)
        self.assertNotIn('AI-generated', html)
        self.issue['headline'] = 'Teams deploy private 5G'
        self.issue['news'] = 'A private 5G network links the site.'
        next_issue = update_homepage(html, self.issue, {}, {})
        self.assertIn('/featured-images/wireless.jpg', next_issue)
        self.assertIn('AI-generated editorial illustration', next_issue)
        self.assertNotIn('/featured-images/offshore.jpg', next_issue)
        neutral = update_homepage(self.template, dict(self.issue, headline='Quarterly results',
                                                      news='The reporting period has ended.'), {}, {})
        self.assertIn('/featured-images/desk.jpg', neutral)

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

    def test_manual_choices_survive_a_new_week_and_reset_to_the_brief(self):
        alternate = dict(self.article, reference='A2', title='Selected by the editor')
        entries = {'A1': self.article, 'A2': alternate, 'P1': self.paper}
        rows = [{'slot': 'field', 'mode': 'manual', 'entry': alternate,
                 'headline': alternate['title'], 'teaser': 'Selected summary'}]
        issue = apply_manual_picks(self.issue, rows, entries)
        paths = dict(self.paths, A2='/articles/two.html')
        result = update_homepage(self.template, issue, entries, paths)
        self.assertIn('Selected by the editor', result)
        self.assertIn('Research question?', result)
        self.assertNotIn('Featured field note', result)
        self.assertEqual(self.issue['field']['reference'], 'A1')
        # New weekly defaults are applied locally; API defaults from an older edition are ignored.
        next_issue = dict(self.issue, edition='2026-11-16')
        self.assertEqual(apply_manual_picks(next_issue, rows, entries)['field']['reference'], 'A2')
        reset = apply_manual_picks(next_issue, [dict(rows[0], mode='weekly')], entries)
        self.assertEqual(reset['field']['reference'], 'A1')

    def test_manual_pick_can_use_either_published_content_type(self):
        rows = [{'slot': 'field', 'mode': 'manual', 'entry': self.paper,
                 'headline': 'A paper chosen for the field', 'teaser': 'A practical research finding'}]
        entries = {'A1': self.article, 'P1': self.paper}
        issue = apply_manual_picks(self.issue, rows, entries)
        result = update_homepage(self.template, issue, entries, self.paths)
        self.assertIn('A paper chosen for the field', result)
        self.assertNotIn('Featured field note', result)
        self.assertEqual(apply_manual_picks(self.issue, rows, {})['field'], self.issue['field'])


if __name__ == '__main__':
    unittest.main()
