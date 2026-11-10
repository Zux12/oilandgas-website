"""Render the weekly homepage edition from its editorial brief and the published feed."""
import json
import subprocess
from datetime import date
from html import escape
from pathlib import Path
from urllib.parse import urlsplit

START = '<!-- Weekly edition: start -->'
END = '<!-- Weekly edition: end -->'


def source_link(source):
    url = source['url']
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError('Use an HTTPS announcement URL for the news source')
    return f'<a href="{escape(url)}">{escape(source["label"])}</a>'


def work_card(label, kind, pick, entries, paths):
    item = entries.get(pick['reference'])
    if item and item['kind'] == kind:
        title = pick.get('headline') or item['title']
        teaser = pick.get('teaser') or item['summary']
    else:
        # If the editor withdraws a selection, feature another published work of the same kind.
        item = max((e for e in entries.values() if e['kind'] == kind),
                   key=lambda e: (e.get('publishedAt') or '', e['reference']), default=None)
        if item is None:
            return ''
        title, teaser = item['title'], item['summary']
    path = escape(paths[item['reference']])
    return f'''<article class="weekly-pick">
<p class="eyebrow">{escape(label)}</p><h3><a href="{path}">{escape(title)}</a></h3>
<p>{escape(teaser)}</p><p class="weekly-byline">{escape(item['byline'])}</p>
</article>'''


def lead_figure(issue):
    selector = Path(__file__).with_name('select_lead_photo.mjs')
    result = subprocess.run(['node', str(selector)], input=json.dumps(issue),
                            text=True, capture_output=True, check=True)
    photo = json.loads(result.stdout)
    credit = escape(photo['credit'])
    if photo.get('source'):
        credit = source_link({'label': photo['credit'], 'url': photo['source']})
    return (f'<figure class="weekly-lead-photo"><img src="/featured-images/{escape(photo["id"])}.jpg" '
            f'alt="{escape(photo["alt"])}" decoding="async" fetchpriority="high">'
            f'<figcaption>{credit}</figcaption></figure>')


def update_homepage(home, issue, entries, paths):
    if home.count(START) != 1 or home.count(END) != 1:
        raise ValueError('Weekly homepage markers are missing or duplicated')
    edition = date.fromisoformat(issue['edition'])
    date_label = f'{edition.day} {edition:%B %Y}'
    sources = [source_link(source) for source in issue['sources']]
    if not sources:
        raise ValueError('The weekly brief needs an original source')
    picks = ''.join([work_card('From the field', 'articles', issue['field'], entries, paths),
                     work_card('Research into practice', 'publications', issue['research'], entries, paths)])
    sidebar = f'<div class="weekly-picks">{picks}</div>' if picks else ''
    layout = 'weekly-grid' if sidebar else 'weekly-grid news-only'
    section = f'''<section class="weekly-edition" aria-label="Weekly industry brief" id="weekly-brief">
<div class="weekly-dateline"><strong>Weekly industry brief</strong>
<time datetime="{edition.isoformat()}">{date_label}</time></div>
<div class="{layout}">
<article class="weekly-lead">
<p class="eyebrow">Industry news · {escape(issue['region'])}</p>
<h2>{escape(issue['headline'])}</h2>
{lead_figure(issue)}
<p>{escape(issue['news'])}</p>
<p class="weekly-engineering"><strong>Engineering perspective</strong> {escape(issue['engineering'])}</p>
<p class="weekly-sources">{' · '.join(sources)}</p>
</article>{sidebar}
</div></section>'''
    before, rest = home.split(START)
    _, after = rest.split(END)
    return before + START + '\n' + section + '\n' + END + after
