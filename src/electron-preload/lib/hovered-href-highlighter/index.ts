import {Deferred} from "ts-deferred";
import {Observable, Subscription} from "rxjs";
import {distinctUntilChanged, filter} from "rxjs/operators";

import {IPC_MAIN_API, IPC_MAIN_API_NOTIFICATION_ACTIONS, IpcMainServiceScan} from "src/shared/api/main";
import {ONE_SECOND_MS, PACKAGE_NAME} from "src/shared/constants";
import {buildLoggerBundle} from "src/electron-preload/lib/util";

// TODO TS add declaration for "index.scss" and use "ES import" then
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const css = require(`to-string-loader!css-loader!sass-loader!./index.scss`);
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const {locals: {renderVisibleClass}}: { locals: { renderVisibleClass: string } } = require(`css-loader!sass-loader!./index.scss`);

export class HoveredHrefHighlightElement extends HTMLElement {
    public static readonly tagName = `${PACKAGE_NAME}-hovered-href-highlight`.toLowerCase();

    private readonly logger = {...buildLoggerBundle(`[${HoveredHrefHighlightElement.tagName}]`)} as const;

    // TODO share single "notification$" instance between all the element instances, so make it static field?
    private notification$?: Observable<IpcMainServiceScan["ApiImplReturns"]["notification"]>;

    private readonly root: ShadowRoot;

    private readonly el: HTMLDivElement;

    private readonly subscription = new Subscription();

    private readonly releaseApiClientDeferred = new Deferred<void>();

    private readonly beforeUnloadEventHandlingArgs: readonly ["beforeunload", () => void] = [
        "beforeunload",
        (): void => this.destroy(),
    ];

    constructor() {
        super();
        this.logger.info("constructor()");
        this.root = this.attachShadow({mode: "closed"});
        this.root.innerHTML = `<style>${String(css)}</style>`;
        this.el = this.root.appendChild(document.createElement("div"));
        window.addEventListener(...this.beforeUnloadEventHandlingArgs);
    }

    destroy(): void {
        this.logger.info("destroy()");
        this.releaseApiClientDeferred.resolve();
        this.subscription.unsubscribe();
        window.removeEventListener(...this.beforeUnloadEventHandlingArgs);
        this.root.innerHTML = "";
        delete this.notification$;
    }

    connectedCallback(): void {
        this.logger.info("connectedCallback()");

        this.subscription.add(
            this.resolveNotification()
                .pipe(
                    filter(IPC_MAIN_API_NOTIFICATION_ACTIONS.is.TargetUrl),
                    distinctUntilChanged(({payload: {url: prev}}, {payload: {url: curr}}) => curr === prev),
                )
                .subscribe(
                    ({payload: {url, position}}) => {
                        const {el} = this;
                        const {style} = el;
                        const render = (): void => {
                            el.innerText = url;
                            el.classList.add(renderVisibleClass);
                        };

                        if (!url) {
                            el.classList.remove(renderVisibleClass);
                            return;
                        }

                        // by default placing at left side and with full max-width
                        style.maxWidth = "100%";
                        style.left = "0";
                        style.right = "auto";

                        if (!position) {
                            render();
                            return;
                        }

                        // render the hint block as hidden
                        style.visibility = "hidden";
                        render();

                        const renderedHintSize = {
                            // TODO subtract width/height of devtools window
                            //      currenty devloots window should be closed/detached for percent size to be properly calculated
                            widthPercent: el.offsetWidth / (window.innerWidth / 100),
                            heightPercent: el.offsetHeight / (window.innerHeight / 100),
                        } as const;
                        const shouldPositionTheHint = (
                            // hint block overlapping the cursor at x-axis
                            (renderedHintSize.widthPercent + 3) > position.cursorXPercent
                            &&
                            // hint block overlapping the cursor at y-axis
                            (renderedHintSize.heightPercent + 3) > (100 - position.cursorYPercent)
                        );

                        if (shouldPositionTheHint) {
                            style.maxWidth = "50%";
                            const shouldPlaceAtRightSide = position.cursorXPercent < 50;
                            if (shouldPlaceAtRightSide) {
                                style.left = "auto";
                                style.right = "0";
                            }
                        }

                        style.visibility = "visible";
                    },
                    this.logger.error.bind(this.logger),
                ),
        );
    }

    disconnectedCallback(): void {
        this.logger.info("disconnectedCallback()");
        this.subscription.unsubscribe();
    }

    private resolveNotification(): Observable<IpcMainServiceScan["ApiImplReturns"]["notification"]> {
        if (this.notification$) {
            return this.notification$;
        }

        const apiClient = IPC_MAIN_API.client({options: {logger: this.logger}});

        return this.notification$ = apiClient(
            "notification",
            {
                finishPromise: this.releaseApiClientDeferred.promise,
                timeoutMs: ONE_SECOND_MS * 3,
            },
        )();
    }
}

export function registerHoveredHrefHighlightElement(
    name = HoveredHrefHighlightElement.tagName,
): {
    tagName: string;
} {
    customElements.define(name, HoveredHrefHighlightElement);

    console.log(`"${name}" custom element has been registered`); // eslint-disable-line no-console

    return {
        tagName: name,
    };
}

export function attachHoveredHrefHighlightElement(): HoveredHrefHighlightElement {
    const el = document.createElement(registerHoveredHrefHighlightElement().tagName) as HoveredHrefHighlightElement;

    document.addEventListener("DOMContentLoaded", () => {
        document.body.appendChild(el);
    });

    return el;
}
