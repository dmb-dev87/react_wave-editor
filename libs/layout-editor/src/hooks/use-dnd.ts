import { useSubscription } from '@waveditors/rxjs-react';
import { filter, fromEvent, map, Subscription, take } from 'rxjs';
import { match, P } from 'ts-pattern';
import {
  mapValue,
  notNullish,
  returnValue,
  selectByType,
} from '@waveditors/utils';
import {
  ElementsStore,
  getElementParent,
  getElementPosition,
  LayoutAddChild,
  LayoutStore,
} from '@waveditors/editor-model';
import { useCallback } from 'react';
import { COLUMN_DATATYPE, ELEMENT_DATATYPE } from '../constants';
import { Context } from '../types';

const detectMousePosition = (elements: ElementsStore) => (e: MouseEvent) => {
  const column = (e.target as HTMLElement).closest(
    `[datatype=${COLUMN_DATATYPE}]`
  );
  const layout = column?.closest(`[datatype=${ELEMENT_DATATYPE}]`);
  if (!column || !layout) return null;
  const columnIndex = Number(column.getAttribute('data-column'));
  if (Number.isNaN(columnIndex)) return null;
  const element = elements.getValue()[layout.id] as LayoutStore;
  const { index, next } = element
    .getValue()
    .params.columns[columnIndex].map((id) => {
      const htmlChild = document.getElementById(id);
      if (!htmlChild) return null;
      const { top, height } = htmlChild.getBoundingClientRect();

      const center = top + height / 2;
      return e.clientY - center;
    })
    .reduce(
      (sum, diff, index) => {
        if (diff && Math.abs(diff) < sum.min)
          return {
            min: Math.abs(diff),
            index,
            next: diff > 0,
          };
        return sum;
      },
      { min: Infinity, index: 0, next: false }
    );
  return {
    layout: layout.id,
    column: columnIndex,
    index,
    next,
  };
};

const positionsToLinkElementToLayout = (
  id: string,
  newPos: LayoutAddChild | null,
  prev: LayoutAddChild['position'] | null
) =>
  match(newPos)
    .with(P.nullish, () =>
      prev ? { element: id, position: prev, samePosition: true } : null
    )
    .with(
      {
        position: {
          layout: prev?.layout,
          column: prev?.column,
        },
      },
      (value) => ({
        ...value,
        samePosition: true,
      })
    )
    .otherwise((value) => ({
      ...value,
      samePosition: false,
    }));

export const useDnd = ({
  elements,
  internalEvents,
  internalState: { isDnd, dndPreview },
  externalEvents,
  events,
}: Context) => {
  const mouseMoveSub = useCallback(
    (element: string) =>
      fromEvent<MouseEvent>(document, 'mousemove')
        .pipe(
          map(detectMousePosition(elements)),
          map((position) => {
            if (!position) return position;
            return {
              element,
              position,
            };
          }),
          filter((e) =>
            match(e)
              .with(dndPreview.value, returnValue(true))
              .otherwise(returnValue(true))
          )
        )
        .subscribe(dndPreview.next.bind(dndPreview)),
    [dndPreview, elements]
  );
  const mouseUpObs = useCallback(
    (sub: Subscription) =>
      fromEvent(document, 'mouseup').pipe(
        map(() => {
          const value = dndPreview.getValue();
          isDnd.next(false);
          dndPreview.next(null);
          sub.unsubscribe();
          return value;
        }),
        take(1)
      ),
    [isDnd, dndPreview]
  );
  useSubscription(() =>
    internalEvents
      .pipe(filter(selectByType('DragIconMouseDown')))
      .subscribe(({ payload: id }) => {
        isDnd.next(true);
        const position = mapValue(
          getElementParent(elements.getValue(), id),
          (parent) => getElementPosition(parent.getValue(), id)
        );
        events.next({ type: 'UnlinkElementFromLayout', payload: id });

        mouseUpObs(mouseMoveSub(id))
          .pipe(
            map((value) => positionsToLinkElementToLayout(id, value, position)),
            filter(notNullish)
          )
          .subscribe((payload) =>
            events.next({ type: 'LinkElementToLayout', payload })
          );
      })
  );
  useSubscription(() =>
    externalEvents
      .pipe(filter(selectByType('OutsideDragStarted')))
      .subscribe(({ payload: element }) => {
        isDnd.next(true);
        mouseUpObs(mouseMoveSub(element.id)).subscribe((value) => {
          if (!value) return;
          // here we will add new element to elements
        });
      })
  );
};
