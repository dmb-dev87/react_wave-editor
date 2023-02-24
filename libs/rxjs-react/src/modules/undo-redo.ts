import { filter, map, pipe, Subject, Unsubscribable } from 'rxjs';
import { generateId, notNullish, returnValue } from '@waveditors/utils';
import { createStore } from '../services';
import { Effect } from '../types';

export interface CommonUndoEvent<T, V> {
  type: T;
  payload: { prev: V; next: V };
}

type EffectExtract<T, E> = Extract<E, { type: T }>;

export interface UndoRedoEffectConfig<
  V,
  A,
  E extends CommonUndoEvent<string, unknown>,
  T
> {
  filterActions?: Array<keyof A>;
  filter?: (event: EffectExtract<T, E>, value: V) => boolean;
}

export interface UndoRedoModule<E extends CommonUndoEvent<string, unknown>>
  extends Unsubscribable {
  undo: Subject<void>;
  redo: Subject<void>;

  onChange: Subject<E>;
  onUndo: Subject<E>;
  onRedo: Subject<E>;

  removeLastEvent: () => void;
  startBunch: () => void;
  endBunch: () => void;
  createUndoRedoEffect: <V, A, T extends E['type']>(
    type: T,
    config?: UndoRedoEffectConfig<V, A, E, T>
  ) => () => Effect<V, A>;
}

type UndoRedoEvent<E> = { id: string; events: E[] };
type UndoRedoEvents<E> = UndoRedoEvent<E>[];
export const undoRedoModule = <E extends CommonUndoEvent<string, unknown>>(
  size = 10
): UndoRedoModule<E> => {
  const onChange = new Subject<E>();

  const undo = new Subject<void>();
  const onUndo = new Subject<E>();

  const redo = new Subject<void>();
  const onRedo = new Subject<E>();

  const bunchEvents = createStore<boolean>()
    .addActions({
      startBunch: () => true,
      endBunch: () => false,
    })
    .run(false);

  // state
  const redoStore = createStore<UndoRedoEvents<E>>()
    .addActions({
      addEvent: (value: UndoRedoEvent<E>, state) => [...state, value],
      removeEvent: (eventId: string, state) =>
        state.filter((value) => value.id !== eventId),
      empty: returnValue([]),
    })
    .addEffect(() => ({
      subscriptions: ({ bs, actions }) => [
        redo
          .pipe(
            map(() => bs.value[bs.value.length - 1]),
            filter(notNullish)
          )
          .subscribe((lastAction) => {
            lastAction.events.reverse().forEach((event) => onRedo.next(event));
            actions.removeEvent(lastAction.id);
            undoStore.actions.addEvents(lastAction);
          }),
      ],
    }))
    .run([]);

  const undoStore = createStore<UndoRedoEvents<E>>()
    .addActions({
      addEvent: (event: E, state) => {
        const notGrouped = [
          ...state,
          {
            id: generateId(),
            events: [event],
          },
        ];
        if (!bunchEvents.getValue() || state.length === 0) return notGrouped;
        return state.map((item, index) => {
          if (index !== state.length - 1) return item;
          return {
            ...item,
            events: [...item.events, event],
          };
        });
      },
      addEvents: (value: UndoRedoEvent<E>, state) => [...state, value],
      removeEvent: (eventId: string, state) =>
        state.filter((value) => value.id !== eventId),
      removeFirst: (_, state) => state.filter((_, index) => index !== 0),
      removeLastEvent: (_, state) =>
        state.filter((_, index) => index !== state.length - 1),
    })
    .addEffect(() => ({
      subscriptions: ({ actions, bs }) => [
        undo
          .pipe(
            map(() => bs.value[bs.value.length - 1]),
            filter(notNullish)
          )
          .subscribe((lastAction) => {
            lastAction.events.reverse().forEach((event) => onUndo.next(event));
            actions.removeEvent(lastAction.id);
            redoStore.actions.addEvent(lastAction);
          }),
        onChange.subscribe(actions.addEvent),
        // remove old undo events
        bs
          .pipe(filter((events) => events.length > size))
          .subscribe(actions.removeFirst),
        // onBunchStarted creating new empty undo event
        bunchEvents.bs
          .pipe(filter(Boolean))
          .subscribe(() => actions.addEvents({ id: generateId(), events: [] })),
      ],
    }))
    .run([]);
  const createUndoRedoEffect =
    <V, A, T extends E['type']>(
      type: T,
      config?: UndoRedoEffectConfig<V, A, E, T>
    ) =>
    (): Effect<V, A> => ({
      filterActions: config?.filterActions,
      beforeAction: ({ bs, next }) => {
        onChange.next({
          type,
          payload: { prev: bs.value, next },
        } as unknown as E);
        if (redoStore.getValue().length > 0) redoStore.actions.empty();
        return true;
      },
      subscriptions: ({ bs }) => {
        const undoRedoPipe = pipe(
          filter(
            (event: E): event is EffectExtract<T, E> => event.type === type
          ),
          filter((event) => config?.filter?.(event, bs.value) ?? true)
        );
        return [
          onUndo.pipe(undoRedoPipe).subscribe((event) => {
            bs.next(event.payload.prev as V);
          }),
          onRedo
            .pipe(undoRedoPipe)
            .subscribe((event) => bs.next(event.payload.next as V)),
        ];
      },
    });
  undoStore.bs.subscribe(console.log);
  const unsubscribe = () => {
    redoStore.unsubscribe();
    undoStore.unsubscribe();
  };
  return {
    undo,
    redo,
    onUndo,
    onRedo,
    onChange,
    createUndoRedoEffect,
    removeLastEvent: undoStore.actions.removeLastEvent,
    ...bunchEvents.actions,
    unsubscribe,
  };
};
