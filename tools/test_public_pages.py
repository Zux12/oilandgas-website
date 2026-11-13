import json
import tempfile
import unittest
from pathlib import Path

import build_public_people as site


class PublicPagesTest(unittest.TestCase):
    def test_publication_lifecycle(self):
        cfg = {'profiles': {}, 'public_members': [], 'credit_overrides': {}}
        item = {'kind': 'articles', 'reference': 'OG-A-1234', 'title': 'Level & flow',
                'byline': 'A. Rahman, B. Wong', 'summary': 'An example summary',
                'sharedBy': 'C. Tan', 'body': 'First paragraph.\n\nLiteral <tag>.'}
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            def build(items):
                outputs = site.make_outputs(items, cfg, root)
                site.save(outputs, root)
                return outputs

            outputs = build({item['reference']: item})
            path = json.loads(outputs[site.PATHS])[item['reference']]
            directory = outputs['authors/index.html']
            self.assertIn('id="author-search"', directory)
            self.assertIn('id="author-directory"', directory)
            self.assertIn('id="author-count"', directory)
            self.assertIn('src="/author-directory.js"', directory)
            self.assertIn('A. Rahman', directory)
            page = outputs[path[1:]]
            self.assertIn('Literal &lt;tag&gt;.', page)
            self.assertIn('data-copy-link', page)
            self.assertIn('src="/publication-actions.js"', page)
            self.assertIn('property="og:type" content="article"', page)
            self.assertIn('property="og:url"', page)
            self.assertIn('"@type": "Article"', page)
            self.assertIn('"name": "A. Rahman"', page)
            self.assertNotIn('"name": "C. Tan"', page)
            self.assertIn('&lt;tag&gt;', page)

            self.assertIn(f'rel="canonical" href="{site.SITE}{path}"', page)
            self.assertIn(site.SITE + path, outputs['sitemap.xml'])
            credit = json.loads(outputs['authors/credits.json'])[item['reference']]
            self.assertEqual(list(credit['authors']), ['A. Rahman', 'B. Wong'])
            self.assertEqual(list(credit['shared']), ['C. Tan'])
            for role in credit.values():
                for profile in role.values():
                    self.assertIn(f'href="{profile}"', page)
                    self.assertIn(f'href="{path}"', outputs[profile[1:]])

            item['title'] = 'A corrected title'
            second = dict(item, reference='OG-A-OTHER', byline='A. Rahman, D. Lee')
            updated = build({item['reference']: item, second['reference']: second})
            new_paths = json.loads(updated[site.PATHS])
            self.assertEqual(new_paths[item['reference']], path)
            self.assertNotEqual(new_paths[second['reference']], path)
            self.assertIn('<h1>A corrected title</h1>', updated[path[1:]])
            author = updated[credit['authors']['A. Rahman'][1:]]
            for url in new_paths.values():
                self.assertIn(f'href="{url}"', author)
            self.assertEqual(updated, build({item['reference']: item, second['reference']: second}))

            withdrawn = build({second['reference']: second})
            self.assertFalse((root / path[1:]).exists())
            self.assertNotIn(site.SITE + path, withdrawn['sitemap.xml'])
            self.assertNotIn(path, withdrawn[site.PATHS])

    def test_related_works_are_topic_matched_and_never_self_linked(self):
        cfg = {'profiles': {}, 'public_members': [], 'credit_overrides': {}}
        entries = {
            'OG-P-ONE': {'kind': 'publications', 'reference': 'OG-P-ONE',
                         'title': 'Meter calibration', 'byline': 'A. Author',
                         'topic': 'Measurement', 'publishedAt': '2026-10-01'},
            'OG-P-TWO': {'kind': 'publications', 'reference': 'OG-P-TWO',
                         'title': 'Gas custody transfer', 'byline': 'B. Author',
                         'topic': 'Measurement', 'publishedAt': '2026-10-02'},
            'OG-A-THREE': {'kind': 'articles', 'reference': 'OG-A-THREE',
                           'title': 'Tank level measurement', 'byline': 'C. Author',
                           'topic': 'Measurement', 'body': 'Text'},
            'OG-P-OTHER': {'kind': 'publications', 'reference': 'OG-P-OTHER',
                            'title': 'Safety study', 'byline': 'D. Author',
                            'topic': 'Safety'}
        }
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            outputs = site.make_outputs(entries, cfg, root)
            paths = json.loads(outputs[site.PATHS])
            page = outputs[paths['OG-P-ONE'][1:]]
            self.assertIn('Related publications', page)
            self.assertIn('Gas custody transfer', page)
            self.assertIn('Tank level measurement', page)
            self.assertNotIn('Safety study', page)
            self.assertEqual(page.count('href="' + paths['OG-P-ONE'] + '"'), 0)
            self.assertIn('href="' + paths['OG-P-TWO'] + '"', page)
            no_match = outputs[paths['OG-P-OTHER'][1:]]
            self.assertNotIn('Related publications', no_match)

    def test_curated_profile_reuses_published_links(self):
        cfg = {'profiles': {'zurix': {'name': 'M. Zurix Mohamed'}}, 'public_members': [],
               'credit_overrides': {}}
        paper = {'kind': 'publications', 'reference': 'OG-P-1234', 'title': 'Metering',
                 'byline': 'M. Zurix Mohamed', 'source': 'https://example.org/paper'}
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            profile = root / site.ZURIX_PAGE[1:]
            profile.write_text('<main><a href="read.html?kind=publications&amp;ref=OG-P-1234">Selected paper</a></main>')
            outputs = site.make_outputs({'OG-P-1234': paper}, cfg, root)
            url = json.loads(outputs[site.PATHS])['OG-P-1234']
            self.assertEqual(outputs[profile.name].count(url), 1)
            self.assertIn('>Selected paper</a>', outputs[profile.name])
            self.assertIn('href="https://example.org/paper"', outputs[url[1:]])
            self.assertIn('"@type": "ScholarlyArticle"', outputs[url[1:]])
            self.assertIn('"sameAs": "https://example.org/paper"', outputs[url[1:]])
            self.assertIn('data-copy-link', outputs[url[1:]])


            site.save(outputs, root)
            self.assertEqual(outputs, site.make_outputs({'OG-P-1234': paper}, cfg, root))


if __name__ == '__main__':
    unittest.main()
