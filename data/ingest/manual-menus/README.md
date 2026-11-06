# Manual menus

Drop menus here for venues whose website has no readable menu (the ingest run lists
them in `data/ingest/needs-attention.json`, with the name to use).

Name each file after the venue's name slug or Google place id. Several files per venue
are fine: add `-2`, `-3` and so on.

    iron-and-oat.jpg        a photo of the menu board
    iron-and-oat-2.jpg      the back of the menu
    green-bowl-co.pdf       a PDF menu
    nonnas-pasta-bar.txt    menu text typed or pasted in

Then run `npm run ingest` again. Manual menus take priority over the website.
