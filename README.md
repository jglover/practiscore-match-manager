# practiscore-match-manager
Browser-based full featured match manager that works with PractiScore

PractiScore Match Manager (PMM) provides a sub-set of the functions
available in PractiScore, and many more that it doesn't. A list of
features includes:
* Load/save matches
  * Load/save match from database
  * Load/save PractiScore .psc file from/to disk
  * Download match from clubs.practiscore.com and SquadSignup.com
  * Import Shoot'n-Score-It EZWS .zip file
* View/edit/add 
  * Categories
  * Classes
  * Competitors
    * Sort/filter
    * Inline or pop-up editing
    * Name-case normalization
    * Set/resequence/reset EZWS #'s
    * Add competitor to print list
  * Divisions
* View
  * Logs
  * Scores
    * Combined or by division
    * Overall or per-stage
    * Sort/filter results
    * Detailed competitor results
  * Stages
* Drag'n'drop squadding
* Automatic polling of stage devices
* Match progress display
  * Overall completion
  * Color-coding (missing scores, DNF, etc)
  * Pop-up list of completed, DNF, missing scores
  * Dynamically updates as scoring devices are polled
* Label printing
  * Stage, chrono, spare, address, packet, verification
  * Print all or selected competitors
  * 5 different sorting options
  * Print configuration saved for each match
* Awards report
  * National, Level III (area), II (state) and I (local)
  * Highly configurable
  * Configuration settings saved for each match
* Configuration/setup
  * Device settings (IP address, polling intervals, etc)
  * Kiosk mode settings (display times)
  * Match progress settings (colors, flare control)
  * PractiScore server settings (name, Bonjour, IPv4/IPv6)
  * UI settings (menu behavior, themeing)
* Kiosk mode
  * Interleaved display of scores, progress, and images
  * Configurable display times for each
  * Permit competitors to view scores
  * Automatic resume after period of inactivity

Last time any development was done on this project was 2016-05-09. The
PractiScore application on iOS and Android has had a number of features added
since that time, and support for them has not been added. It's also possible
that new features may have broken things that used to work in this application.

I'm hoping that someone may get interested in this work and continue it.

At the time I stopped development, the lodash library had split into the 3.x
and 4.x versions. 4.x breaks the hell out of many applications, including this
one, so it's reliant on 3.x. Around that time jade was also replaced by pug.
This app was converted to pug, but the 'views' directory with the old 'jade'
files still exists.

One of the things I never got the hang of was being able to use the same
install of libraries for both the server-side and client-side code. As a result
of this, 'jquery' is installed in two places. This is sub-optimal.

There's a lot of effort that was put into this, and it's been used in a number
of matches, including GA State, AL State, Area 6, and a lot of local matches.
The awards reports was particulary useful in the Area 6 matches, and produced
complete reports within a few seconds of the match ending (far better than
anything EZWinScore supports). 

One of the cooler features, and also one of the first implemented, is the match
completion status. This was subsequently absorbed into the iOS version of
PractiScore (and maybe the Android version, although I rarely used it). The
match status page displays a grid indicating the completion status of each
stage and squad in the match, including missing scores. This, combined with
automatic polling of the scoring devices, allows a match director to have a
near real-time view of the progress of the match.

Another bit that I particularly like is the competitor check-in screen. This
tracks which competitors have checked in, squad availability, payment status,
display of all people on a squad, rapidly change divisions, etc. This was
particularly useful for local matches. We allow people to register online or as
a walk-up. About 15% of the people who register online never show up, and we
have about a 15% walk-up rate. As a result, we're never sure how full a squad
will actually be. This page allows us to rapidly balance squads at the close of
registration.

Somewhere around February 2016 I got burned out scoring matches. As a result, I
also lost interest in continuing development on this app. Rather than just
letting this software rot on a disk somewhere, I thought I'd put it up on
Github and hope someone else takes it over.
