#  Copyright (C) 2020  Consiglio Nazionale delle Ricerche
#
#      This program is free software: you can redistribute it and/or modify
#      it under the terms of the GNU Affero General Public License as
#      published by the Free Software Foundation, either version 3 of the
#      License, or (at your option) any later version.
#
#      This program is distributed in the hope that it will be useful,
#      but WITHOUT ANY WARRANTY; without even the implied warranty of
#      MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#      GNU Affero General Public License for more details.
#
#      You should have received a copy of the GNU Affero General Public License
#      along with this program.  If not, see <https://www.gnu.org/licenses/>.

import docs_italia_theme

# Register the theme as an extension to generate a sitemap.xml
# extensions.append('sphinx_material')
from recommonmark.parser import CommonMarkParser
source_parsers = {
    '.md': CommonMarkParser,
}

project = 'Selezioni on-line'
release = '4.4.32'
author = u'Consiglio Nazionale delle Ricerche'

show_authors = True
# Grouping the document tree into LaTeX files. List of tuples
# (source start file, target name, title, author, documentclass [howto/manual]).
latex_documents = [
    ('index', 'Manuale-Selezioni-online.tex', project, author, 'manual'),
]
latex_elements = {
    'extraclassoptions': 'openany,oneside'
}
epub_basename = u'Manuale-Selezioni-online'

html_theme = "docs_italia_theme"
html_theme_path = [docs_italia_theme.get_html_theme_path()]

copyright = "2020 Consiglio Nazionale delle Ricerche"
html_title = "Selezioni online"
html_show_sourcelink = False
html_favicon = "favicon.ico"
html_logo = "logo.png"
latex_logo = 'logo_blue.png'
html_baseurl = 'docs'
smartquotes = False
language = "it"
# The master toctree document.
master_doc = 'index'
source_suffix = ['.rst','.md']
html_sidebars = {
    '**': ['localtoc.html', 'globaltoc.html', 'sourcelink.html', 'searchbox.html']
}
# These folders are copied to the documentation's HTML output
html_static_path = ['_static']
templates_path = ['_templates']
# These paths are either relative to html_static_path
# or fully qualified paths (eg. https://...)
html_css_files = [
    'css/extra.css',
    'css/hacks.css',
    'css/material.css'
]
extensions = [
    'docs_italia_theme',
    'sphinxcontrib.images',
    "sphinx.ext.autodoc",
    "numpydoc",
    "sphinx.ext.doctest",
    "sphinx.ext.extlinks",
    "sphinx.ext.intersphinx",
    "sphinx.ext.todo",
    "sphinx.ext.mathjax",
    "sphinx.ext.viewcode",
    "nbsphinx",
    "sphinx_markdown_tables",
    'sphinx.ext.githubpages'
]

